import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";
import { EduTrackLogo } from "../components/EduTrackLogo";

export const ClassTeacherLogin: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await loginWithCredentials("teacher", email.trim(), password);
    setLoading(false);
    if (result.ok) {
      navigate("/teacher/dashboard", { replace: true });
    } else {
      setError(result.message ?? "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-6 w-full max-w-md shadow-lg border-border">
        <div className="mb-6 flex justify-center">
          <EduTrackLogo variant="full" size="md" showTagline={true} />
        </div>
        <h2 className="font-display text-xl font-bold mb-4 text-center">Class Teacher Login</h2>
        {error && <p className="text-sm text-destructive mb-2 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
            <Input
              required
              type="email"
              placeholder="teacher@edutrack.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Password</label>
            <Input
              required
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Sign In
          </Button>
        </form>
        <div className="mt-6 pt-4 border-t border-border/60 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/")}
          >
            ← Back to Academic Portal Hub
          </Button>
        </div>
      </Card>
    </div>
  );
};
