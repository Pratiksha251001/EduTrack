import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Send,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info,
  Terminal,
  HelpCircle,
  Radio,
} from "lucide-react";
import {
  getSmsGatewayStatus,
  sendTestSmsViaGateway,
  updateSmsGatewayConfig,
  SmsGatewayStatus,
} from "../lib/smsService";

interface Msg91SetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTestSent?: () => void;
}

export const Msg91SetupModal: React.FC<Msg91SetupModalProps> = ({
  open,
  onOpenChange,
  onTestSent,
}) => {
  const [activeTab, setActiveTab] = useState<"status" | "config" | "guide">("status");
  const [status, setStatus] = useState<SmsGatewayStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Configuration edit state
  const [authKeyInput, setAuthKeyInput] = useState("");
  const [senderIdInput, setSenderIdInput] = useState("EDUTRK");
  const [routeInput, setRouteInput] = useState("4");
  const [templateIdInput, setTemplateIdInput] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveStatus, setConfigSaveStatus] = useState<string | null>(null);

  // Test form state
  const [testMobile, setTestMobile] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Dear Parent, Aarav Sharma is absent for Data Structures today. Please contact college office. - EduTrack"
  );
  const [testPreset, setTestPreset] = useState<"en" | "mr" | "custom">("en");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    raw?: any;
    simulated?: boolean;
    carrierBlocked?: boolean;
    error418?: boolean;
    serverIp?: string;
    time?: string;
  } | null>(null);

  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2500);
  };

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await getSmsGatewayStatus();
      setStatus(data);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStatus();
      setTestResult(null);
      setConfigSaveStatus(null);
    }
  }, [open]);

  useEffect(() => {
    if (status) {
      if (status.senderId) setSenderIdInput(status.senderId);
      if (status.route) setRouteInput(status.route);
      if (status.templateId) setTemplateIdInput(status.templateId);
    }
  }, [status]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSaveStatus(null);
    try {
      const res = await updateSmsGatewayConfig({
        authKey: authKeyInput.trim() || undefined,
        senderId: senderIdInput.trim() || undefined,
        route: routeInput.trim() || undefined,
        templateId: templateIdInput.trim() || undefined,
      });
      if (res.success) {
        setConfigSaveStatus("Credentials updated successfully! MSG91 Gateway is active.");
        fetchStatus();
      } else {
        setConfigSaveStatus("Failed: " + res.message);
      }
    } catch (err: any) {
      setConfigSaveStatus("Error: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handlePresetChange = (preset: "en" | "mr" | "custom") => {
    setTestPreset(preset);
    if (preset === "en") {
      setTestMessage(
        "Dear Parent, Student Rohan Patil is absent for Mathematics today (09-10-2026). Attendance marked via EduTrack."
      );
    } else if (preset === "mr") {
      setTestMessage(
        "पालकहो, विद्यार्थी रोहन पाटील आज (09-10-2026) गणित विषयाच्या तासाला गैरहजर आहे. - EduTrack SMIT"
      );
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMobile.trim() || testMobile.replace(/[^0-9]/g, "").length < 10) {
      setTestResult({
        success: false,
        message: "Kripya 10-digit ka valid mobile number dalein.",
        time: new Date().toLocaleTimeString(),
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await sendTestSmsViaGateway(testMobile.trim(), testMessage.trim());
      setTestResult({
        success: res.success,
        message: res.message,
        simulated: res.simulated,
        raw: res.rawResponse,
        carrierBlocked: res.carrierBlocked,
        error418: res.error418,
        serverIp: res.serverIp,
        time: new Date().toLocaleTimeString(),
      });
      fetchStatus();
      onTestSent?.();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Test dispatch failed",
        time: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const envSnippet = `# MSG91 SMS Gateway Configuration
MSG91_AUTHKEY=your_msg91_authkey_here
MSG91_SENDER_ID=EDUTRK
MSG91_TEMPLATE_ID=your_dlt_template_id_here
MSG91_ROUTE=4
MSG91_DLT_TE_ID=`;

  const copyEnvSnippet = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  MSG91 SMS Gateway Setup & Testing
                </DialogTitle>
                {status?.isConfigured ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                    <CheckCircle className="h-3 w-3 mr-1 inline" /> Live Carrier
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs">
                    <Radio className="h-3 w-3 mr-1 inline animate-pulse" /> Simulation Mode
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Official SMS Gateway Integration for EduTrack Parent Alerts & Attendance Dispatch
              </DialogDescription>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatus}
              disabled={loadingStatus}
              className="h-8 text-xs text-muted-foreground"
              title="Refresh Gateway Status"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingStatus ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("status")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "status"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="h-3.5 w-3.5 inline mr-1" />
              Live Test & Status
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("config")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "config"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Terminal className="h-3.5 w-3.5 inline mr-1" />
              Configuration (.env)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("guide")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === "guide"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5 inline mr-1" />
              Setup Guide (Steps)
            </button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: STATUS & TEST */}
          {activeTab === "status" && (
            <div className="space-y-5">
              {/* Carrier Warning for MSG91 Error 418 (IP Whitelist Required) */}
              {(status?.error418Detected || testResult?.error418) && (
                <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-200 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-rose-700 dark:text-rose-300">
                        Carrier Alert: MSG91 Error 418 (IP Not Whitelisted)
                      </div>
                      <p className="text-xs leading-relaxed opacity-90">
                        Aapke MSG91 dashboard me aapki AuthKey par <strong>IP Restriction</strong> enable hai. Is wajah se MSG91 ne SMS requests ko carrier level par reject/hold kar rakha hai.
                      </p>
                    </div>
                  </div>

                  <div className="bg-background/80 dark:bg-background/40 p-3 rounded-lg border border-rose-500/20 text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        Current Server Public IP:
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 rounded bg-muted font-mono font-bold text-primary text-xs">
                          {status?.serverIp || testResult?.serverIp || "34.34.254.233"}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyIp(status?.serverIp || testResult?.serverIp || "34.34.254.233")}
                          className="h-7 text-xs gap-1"
                        >
                          {copiedIp ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          {copiedIp ? "Copied" : "Copy IP"}
                        </Button>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-border/50 space-y-1.5 text-[11px] text-muted-foreground">
                      <div className="font-semibold text-foreground">Isko Fix Karne ke Steps (1 Minute):</div>
                      <ol className="list-decimal list-inside space-y-1 pl-1">
                        <li>
                          <strong>MSG91 Dashboard</strong> kholein (<a href="https://control.msg91.com" target="_blank" rel="noreferrer" className="text-primary underline">control.msg91.com</a>).
                        </li>
                        <li>
                          Sidebar me <strong>Authkey</strong> par click karein aur apni AuthKey select karein.
                        </li>
                        <li>
                          <strong>Option 1 (Sabse Recommended):</strong> <strong>"IP Restriction"</strong> setting ko <strong>OFF / Disable</strong> kar dein taaki kisi bhi environment (AI Studio ya Local VS Code) se SMS bina block huye deliver ho sakein.
                        </li>
                        <li>
                          <strong>Option 2:</strong> Upar diya gaya Server IP (<code>{status?.serverIp || testResult?.serverIp || "34.34.254.233"}</code>) Whitelist box me paste karke Save karein.
                        </li>
                        <li>
                          <strong>TRAI DLT Mandate (India):</strong> MSG91 trial account me custom Sender ID <code>EDUTRK</code> tabhi deliver hota hai jab TRAI DLT portal par Entity & Template approved ho.
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Summary Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  status?.isConfigured
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
                }`}
              >
                {status?.isConfigured ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                )}
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-sm">
                    {status?.isConfigured
                      ? "MSG91 Cloud Gateway Active (Live Sending Ready)"
                      : "MSG91 Gateway in Simulation Mode"}
                  </div>
                  <p className="opacity-90 leading-relaxed">
                    {status?.isConfigured
                      ? `Credentials verified. Messages marked during attendance will be delivered via MSG91 (Sender ID: ${status?.senderId || "EDUTRK"}).`
                      : "Abhi .env file me MSG91_AUTHKEY add nahi hai. App safely simulation mode me chal raha hai aur SMS logs record kar raha hai. Live SMS ke liye Setup Guide dekhein."}
                  </p>
                </div>
              </div>

              {/* Quick Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg border border-border bg-card/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Gateway</div>
                  <div className="text-sm font-bold mt-0.5">MSG91</div>
                  <div className="text-[11px] text-muted-foreground">Flow / Send API</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Sender ID</div>
                  <div className="text-sm font-bold mt-0.5">{status?.senderId || "EDUTRK"}</div>
                  <div className="text-[11px] text-muted-foreground">DLT Header</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Route</div>
                  <div className="text-sm font-bold mt-0.5">Route {status?.route || "4"}</div>
                  <div className="text-[11px] text-muted-foreground">Transactional</div>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Dispatched</div>
                  <div className="text-sm font-bold mt-0.5">{status?.totalDispatched || 0}</div>
                  <div className="text-[11px] text-muted-foreground">Since server start</div>
                </div>
              </div>

              {/* Live Test Console */}
              <div className="p-4 rounded-xl border border-border bg-card/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Test SMS Dispatch</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePresetChange("en")}
                      className={`h-6 px-2 text-[11px] ${testPreset === "en" ? "border-primary bg-primary/10" : ""}`}
                    >
                      English
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePresetChange("mr")}
                      className={`h-6 px-2 text-[11px] ${testPreset === "mr" ? "border-primary bg-primary/10" : ""}`}
                    >
                      मराठी (Marathi)
                    </Button>
                  </div>
                </div>

                <form onSubmit={handleSendTest} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Parent Mobile Number (10 digits)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">+91</span>
                      <Input
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={testMobile}
                        onChange={(e) => setTestMobile(e.target.value.replace(/[^0-9]/g, ""))}
                        className="pl-11 font-mono text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block">Message Content</label>
                    <textarea
                      rows={2}
                      value={testMessage}
                      onChange={(e) => {
                        setTestMessage(e.target.value);
                        setTestPreset("custom");
                      }}
                      className="w-full text-xs font-mono rounded-md border border-input bg-background px-3 py-2 leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                      <span>{testMessage.length} characters</span>
                      <span>1 SMS credit (~160 chars)</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSendingTest}
                    className="w-full sm:w-auto text-xs font-semibold gap-1.5"
                  >
                    <Send className={`h-3.5 w-3.5 ${isSendingTest ? "animate-spin" : ""}`} />
                    {isSendingTest ? "Sending via MSG91..." : "Send Test SMS Now"}
                  </Button>
                </form>

                {/* Test Result Display */}
                {testResult && (
                  <div
                    className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                      testResult.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                        : "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        {testResult.success ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        {testResult.success ? "Dispatch Succeeded" : "Dispatch Failed"}
                      </span>
                      <span className="text-[10px] opacity-75">{testResult.time}</span>
                    </div>
                    <p className="leading-relaxed opacity-95">{testResult.message}</p>
                    {testResult.raw && (
                      <div className="mt-1 pt-1 border-t border-border/40 font-mono text-[10px] opacity-80 truncate">
                        Raw Response: {JSON.stringify(testResult.raw)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CONFIGURATION */}
          {activeTab === "config" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs space-y-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Live MSG91 Gateway Configuration
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Apne MSG91 dashboard ki credentials yaha enter karein. Yeh seedhe backend me sync ho jayegi aur real mobile SMS dispatch shuru ho jayega.
                </p>
              </div>

              {/* Direct Configuration Form */}
              <form onSubmit={handleSaveConfig} className="p-4 rounded-xl border border-border bg-card/50 space-y-3.5 text-xs">
                <div className="font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-primary" />
                    Configure MSG91 Credentials
                  </span>
                  <Badge variant={status?.isConfigured ? "default" : "secondary"} className="text-[10px]">
                    {status?.isConfigured ? "Live Gateway Active" : "Simulation Mode"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="font-medium mb-1 block">
                      MSG91 AuthKey <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder={status?.isConfigured ? "•••••••••••••••••••••••• (Active Key Configured)" : "Paste your MSG91 AuthKey here"}
                      value={authKeyInput}
                      onChange={(e) => setAuthKeyInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Dashboard → Developers → AuthKey se generate kiya gaya 24-32 characters ka code.
                    </p>
                  </div>

                  <div>
                    <label className="font-medium mb-1 block">Sender ID (Header)</label>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="EDUTRK"
                      value={senderIdInput}
                      onChange={(e) => setSenderIdInput(e.target.value.toUpperCase())}
                      className="font-mono text-xs uppercase"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      6-alphabets DLT Sender ID (Default: EDUTRK).
                    </p>
                  </div>

                  <div>
                    <label className="font-medium mb-1 block">Route</label>
                    <Input
                      type="text"
                      placeholder="4"
                      value={routeInput}
                      onChange={(e) => setRouteInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      4 = Transactional / Instant OTP/Alerts route.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-medium mb-1 block">DLT Template / Flow ID (Optional)</label>
                    <Input
                      type="text"
                      placeholder="Leave blank to use direct Send API"
                      value={templateIdInput}
                      onChange={(e) => setTemplateIdInput(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Agar MSG91 Flow use kar rahe hain toh Template ID daalein, warna Send API direct kaam karega.
                    </p>
                  </div>
                </div>

                {configSaveStatus && (
                  <div
                    className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                      configSaveStatus.includes("successfully") || configSaveStatus.includes("active")
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30"
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>{configSaveStatus}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={isSavingConfig}
                    size="sm"
                    className="text-xs font-semibold gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSavingConfig ? "animate-spin" : ""}`} />
                    {isSavingConfig ? "Updating..." : "Save & Activate Credentials"}
                  </Button>
                </div>
              </form>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Required `.env` Variables
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyEnvSnippet}
                    className="h-7 text-xs gap-1"
                  >
                    {copiedEnv ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copiedEnv ? "Copied" : "Copy .env Snippet"}
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-black/90 text-emerald-400 font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed">
                  <pre>{envSnippet}</pre>
                </div>
              </div>

              {/* Table of config variables */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left p-2.5 font-semibold">Variable</th>
                      <th className="text-left p-2.5 font-semibold">Description</th>
                      <th className="text-left p-2.5 font-semibold">Active Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="p-2.5 font-mono text-primary font-medium">MSG91_AUTHKEY</td>
                      <td className="p-2.5 text-muted-foreground">Your 24/32-character AuthKey from MSG91 dashboard</td>
                      <td className="p-2.5 font-mono">
                        {status?.isConfigured ? "••••••••••••• (Configured)" : "None (Simulation)"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono text-primary font-medium">MSG91_SENDER_ID</td>
                      <td className="p-2.5 text-muted-foreground">6-character DLT registered sender header (e.g., EDUTRK)</td>
                      <td className="p-2.5 font-mono">{status?.senderId || "EDUTRK"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono text-primary font-medium">MSG91_TEMPLATE_ID</td>
                      <td className="p-2.5 text-muted-foreground">Optional Flow Template ID for DLT approved templates</td>
                      <td className="p-2.5 font-mono">{status?.templateId || "None (Using Send API)"}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono text-primary font-medium">MSG91_ROUTE</td>
                      <td className="p-2.5 text-muted-foreground">SMS delivery route (4 = Transactional / High Priority)</td>
                      <td className="p-2.5 font-mono">{status?.route || "4"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STEP-BY-STEP SETUP GUIDE */}
          {activeTab === "guide" && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-200">
                <div className="font-bold text-sm mb-1">MSG91 Setup Guide (Aasan Steps) 🚀</div>
                <p className="opacity-90 leading-relaxed">
                  Aapke EduTrack app me MSG91 connect karne ke liye niche diye gaye 4 steps follow karein:
                </p>
              </div>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      1
                    </span>
                    MSG91 Account Banayein
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-7">
                    Official website par jayein:{" "}
                    <a
                      href="https://msg91.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                    >
                      msg91.com <ExternalLink className="h-3 w-3" />
                    </a>
                    . Account register karein aur free SMS credits prapt karein.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      2
                    </span>
                    AuthKey Generate Karein & IP Restriction Disable Karein (Important!)
                  </div>
                  <div className="text-muted-foreground leading-relaxed pl-7 space-y-1.5">
                    <p>
                      MSG91 Dashboard me login karne ke baad: <strong>Developers</strong> → <strong>Authkey</strong> par jayein.
                    </p>
                    <p className="p-2 rounded bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20 text-[11px]">
                      ⚠️ <strong>Crucial Step:</strong> Apni AuthKey ki settings me jakar <strong>"IP Restriction"</strong> ya <strong>"Whitelist IP"</strong> ko <strong>OFF / Disable</strong> karein. Agar yeh ON rehta hai, toh MSG91 carrier <code>Error 418</code> return karta hai aur kisi bhi machine (AI Studio ya Local VS Code) se SMS phone par deliver nahi hota.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      3
                    </span>
                    VS Code me `.env` File me Add Karein
                  </div>
                  <div className="pl-7 space-y-2">
                    <p className="text-muted-foreground leading-relaxed">
                      Apne project ke root folder me <code>.env</code> file kholein aur yeh lines add karein:
                    </p>
                    <div className="p-2.5 rounded bg-black/80 font-mono text-[11px] text-emerald-400 border border-zinc-800">
                      MSG91_AUTHKEY=aapki_msg91_authkey_yaha_dalein<br />
                      MSG91_SENDER_ID=EDUTRK<br />
                      MSG91_ROUTE=4
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Save karne ke baad VS Code terminal me <code>npm run dev</code> restart karein.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 rounded-lg border border-border bg-card/60 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      4
                    </span>
                    Live Dispatch Verify Karein!
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-7">
                    Upar <strong>"Live Test & Status"</strong> tab me apna mobile number daalkar test karein. Jaise hi test successful hoga, jab bhi teachers daily attendance submit karenge ya HOD alerts bhejenge, parents ke phone par real SMS deliver hona shuru ho jayega!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            <span>TRAI DLT compliant · Supports English & Marathi</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
