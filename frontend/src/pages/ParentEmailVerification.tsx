import React from "react";
import { CheckCircle2, CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { apiFetch } from "../lib/api";

type VerificationState = "verifying" | "verified" | "invalid" | "unavailable";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[a-f0-9]{64}$/;

export const ParentEmailVerification: React.FC = () => {
  const [state, setState] = React.useState<VerificationState>("verifying");
  const submitted = React.useRef(false);

  React.useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;

    const params = new URLSearchParams(window.location.search);
    const studentId = params.get("studentId") || "";
    const token = params.get("token") || "";

    // Remove the one-time token from the visible address and browser history
    // before contacting the backend. The token is never rendered or logged.
    window.history.replaceState({}, document.title, window.location.pathname);

    if (!UUID.test(studentId) || !TOKEN.test(token)) {
      setState("invalid");
      return;
    }

    const confirm = async () => {
      try {
        const response = await apiFetch(
          "/api/parents/email/verification/confirm",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, token }),
          },
        );
        const payload = await response.json().catch(() => ({}));

        if (
          response.ok &&
          payload?.success === true &&
          payload?.verified === true
        ) {
          setState("verified");
          return;
        }

        if (response.status === 400) {
          setState("invalid");
          return;
        }

        setState("unavailable");
      } catch {
        setState("unavailable");
      }
    };

    void confirm();
  }, []);

  const config = {
    verifying: {
      icon: <Loader2 className="h-10 w-10 animate-spin text-primary" />,
      title: "Verifying parent email",
      description:
        "Please keep this page open while EduTrack confirms the link.",
    },
    verified: {
      icon: <CheckCircle2 className="h-10 w-10 text-emerald-600" />,
      title: "Parent email verified",
      description:
        "Verification is complete. EduTrack can now use this address for eligible attendance notifications.",
    },
    invalid: {
      icon: <CircleAlert className="h-10 w-10 text-destructive" />,
      title: "Verification link is invalid or expired",
      description:
        "Ask an authorized EduTrack staff member to send a new verification email.",
    },
    unavailable: {
      icon: <CircleAlert className="h-10 w-10 text-amber-600" />,
      title: "Verification service is unavailable",
      description: "Please try the same link again later.",
    },
  }[state];

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            {config.icon}
          </div>
          <CardTitle>{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            The verification token is not displayed or stored on this page.
          </div>
          {state !== "verifying" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.assign("/")}
            >
              Return to EduTrack
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
};
