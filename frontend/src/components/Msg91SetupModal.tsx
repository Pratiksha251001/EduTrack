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
  Sliders,
  Globe,
  Code2,
} from "lucide-react";
import {
  getSmsGatewayStatus,
  sendTestSmsViaGateway,
  updateSmsGatewayConfig,
  SmsGatewayStatus,
  SmsProviderType,
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
  const [activeTab, setActiveTab] = useState<"test" | "providers" | "guide">("test");
  const [status, setStatus] = useState<SmsGatewayStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Selected provider in settings tab
  const [selectedProvider, setSelectedProvider] = useState<SmsProviderType>("fast2sms");

  // Provider-specific input state
  // 1. Fast2SMS
  const [fast2smsApiKey, setFast2smsApiKey] = useState("");
  const [fast2smsRoute, setFast2smsRoute] = useState("q");

  // 2. MSG91
  const [msg91AuthKey, setMsg91AuthKey] = useState("");
  const [msg91SenderId, setMsg91SenderId] = useState("EDUTRK");
  const [msg91Route, setMsg91Route] = useState("4");
  const [msg91TemplateId, setMsg91TemplateId] = useState("");
  const [msg91DltTeId, setMsg91DltTeId] = useState("");

  // 3. Twilio
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioFromNumber, setTwilioFromNumber] = useState("");

  // 4. Textlocal
  const [textlocalApiKey, setTextlocalApiKey] = useState("");
  const [textlocalSender, setTextlocalSender] = useState("TXTLCL");

  // 5. Custom Gateway
  const [customUrl, setCustomUrl] = useState("");
  const [customMethod, setCustomMethod] = useState<"POST" | "GET">("POST");
  const [customHeaders, setCustomHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [customBody, setCustomBody] = useState('{\n  "to": "{clean10}",\n  "message": "{message}"\n}');
  const [customApiKey, setCustomApiKey] = useState("");
  const [customSenderId, setCustomSenderId] = useState("EDUTRK");

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSaveStatus, setConfigSaveStatus] = useState<string | null>(null);

  // Test form state
  const [testMobile, setTestMobile] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Dear Parent, Student Rohan Patil is absent for Mathematics today. Marked via EduTrack SMIT."
  );
  const [testPreset, setTestPreset] = useState<"en" | "mr" | "hi" | "custom">("en");
  const [testProviderChoice, setTestProviderChoice] = useState<string>("active");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    raw?: any;
    simulated?: boolean;
    carrierBlocked?: boolean;
    error418?: boolean;
    serverIp?: string;
    gateway?: string;
    messageId?: string;
    time?: string;
  } | null>(null);

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
      if (data.activeProvider) {
        setSelectedProvider(data.activeProvider as SmsProviderType);
      } else if (data.provider) {
        setSelectedProvider(data.provider as SmsProviderType);
      }

      // Populate provider fields from server status if available
      if (data.fast2sms?.apiKey) setFast2smsApiKey(data.fast2sms.apiKey);
      if (data.fast2sms?.route) setFast2smsRoute(data.fast2sms.route);

      if (data.msg91?.authKey) setMsg91AuthKey(data.msg91.authKey);
      if (data.msg91?.senderId) setMsg91SenderId(data.msg91.senderId);
      if (data.msg91?.templateId) setMsg91TemplateId(data.msg91.templateId);
      if (data.msg91?.route) setMsg91Route(data.msg91.route);
      if (data.msg91?.dltTeId) setMsg91DltTeId(data.msg91.dltTeId);

      if (data.twilio?.accountSid) setTwilioAccountSid(data.twilio.accountSid);
      if (data.twilio?.authToken) setTwilioAuthToken(data.twilio.authToken);
      if (data.twilio?.fromNumber) setTwilioFromNumber(data.twilio.fromNumber);

      if (data.textlocal?.apiKey) setTextlocalApiKey(data.textlocal.apiKey);
      if (data.textlocal?.sender) setTextlocalSender(data.textlocal.sender);

      if (data.custom?.url) setCustomUrl(data.custom.url);
      if (data.custom?.method) setCustomMethod(data.custom.method as "POST" | "GET");
      if (data.custom?.headers) setCustomHeaders(data.custom.headers);
      if (data.custom?.bodyTemplate) setCustomBody(data.custom.bodyTemplate);
      if (data.custom?.apiKey) setCustomApiKey(data.custom.apiKey);
      if (data.custom?.senderId) setCustomSenderId(data.custom.senderId);
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

  const handleSaveActiveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigSaveStatus(null);

    try {
      const payload: any = {
        activeProvider: selectedProvider,
      };

      if (selectedProvider === "fast2sms") {
        payload.fast2sms = {
          apiKey: fast2smsApiKey.trim(),
          route: fast2smsRoute.trim(),
        };
      } else if (selectedProvider === "msg91") {
        payload.msg91 = {
          authKey: msg91AuthKey.trim(),
          senderId: msg91SenderId.trim(),
          templateId: msg91TemplateId.trim(),
          route: msg91Route.trim(),
          dltTeId: msg91DltTeId.trim(),
        };
      } else if (selectedProvider === "twilio") {
        payload.twilio = {
          accountSid: twilioAccountSid.trim(),
          authToken: twilioAuthToken.trim(),
          fromNumber: twilioFromNumber.trim(),
        };
      } else if (selectedProvider === "textlocal") {
        payload.textlocal = {
          apiKey: textlocalApiKey.trim(),
          sender: textlocalSender.trim(),
        };
      } else if (selectedProvider === "custom") {
        payload.custom = {
          url: customUrl.trim(),
          method: customMethod,
          headers: customHeaders.trim(),
          bodyTemplate: customBody.trim(),
          apiKey: customApiKey.trim(),
          senderId: customSenderId.trim(),
        };
      }

      const res = await updateSmsGatewayConfig(payload);
      if (res.success) {
        setConfigSaveStatus(`Success! ${selectedProvider.toUpperCase()} is now your active SMS Gateway.`);
        await fetchStatus();
      } else {
        setConfigSaveStatus("Save failed: " + res.message);
      }
    } catch (err: any) {
      setConfigSaveStatus("Error: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handlePresetChange = (preset: "en" | "mr" | "hi" | "custom") => {
    setTestPreset(preset);
    if (preset === "en") {
      setTestMessage(
        "Dear Parent, Student Rohan Patil is absent for Mathematics today. Marked via EduTrack SMIT."
      );
    } else if (preset === "mr") {
      setTestMessage(
        "पालकहो, विद्यार्थी रोहन पाटील आज गणित विषयाच्या तासाला गैरहजर आहे. - EduTrack SMIT"
      );
    } else if (preset === "hi") {
      setTestMessage(
        "प्रिय अभिभावक, छात्र रोहन पाटिल आज गणित कक्षा में अनुपस्थित है। - EduTrack SMIT"
      );
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumbers = testMobile.replace(/[^0-9]/g, "");
    if (!cleanNumbers || cleanNumbers.length < 10) {
      setTestResult({
        success: false,
        message: "Kripya valid 10-digit mobile number dalein (e.g. 9876543210).",
        time: new Date().toLocaleTimeString(),
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const chosenProvider = testProviderChoice === "active" ? (status?.activeProvider || "fast2sms") : testProviderChoice;
      const res = await sendTestSmsViaGateway(testMobile.trim(), testMessage.trim(), {
        provider: chosenProvider,
      });

      setTestResult({
        success: res.success,
        message: res.message,
        simulated: res.simulated,
        raw: res.rawResponse,
        carrierBlocked: res.carrierBlocked,
        error418: res.error418,
        serverIp: res.serverIp,
        gateway: res.gateway,
        messageId: res.messageId,
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

  const activeProviderName = (status?.activeProvider || status?.provider || "fast2sms").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Universal SMS Gateway Setup
                </DialogTitle>
                {status?.isConfigured ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold">
                    <CheckCircle className="h-3 w-3 mr-1 inline" /> {activeProviderName} Live Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs">
                    <Radio className="h-3 w-3 mr-1 inline animate-pulse" /> Simulation Mode
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Connect any SMS provider (Fast2SMS, MSG91, Twilio, Textlocal, or Custom API) to send real cellular messages to parents.
              </DialogDescription>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatus}
              disabled={loadingStatus}
              className="h-8 px-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/40">
            <button
              onClick={() => setActiveTab("test")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "test"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              Live Test SMS
            </button>
            <button
              onClick={() => setActiveTab("providers")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "providers"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Providers & API Keys
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "guide"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              IP & Carrier Diagnostics
            </button>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: LIVE TEST SMS */}
          {activeTab === "test" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-start gap-3">
                <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    Active Gateway: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{activeProviderName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({status?.isConfigured ? "Real Carrier Mode" : "Simulation Mode"})
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    Type any phone number below to send a live test SMS. If you have another provider key, switch to the <strong>Providers & API Keys</strong> tab.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendTest} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    Parent / Recipient Mobile Number (10 Digits) *
                  </label>
                  <Input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={testMobile}
                    onChange={(e) => setTestMobile(e.target.value)}
                    className="font-mono text-sm tracking-wide"
                    maxLength={13}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Simple Text Message
                    </label>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handlePresetChange("en")}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          testPreset === "en" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetChange("mr")}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          testPreset === "mr" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        मराठी
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetChange("hi")}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          testPreset === "hi" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        हिंदी
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetChange("custom")}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          testPreset === "custom" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={testMessage}
                    onChange={(e) => {
                      setTestMessage(e.target.value);
                      setTestPreset("custom");
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Enter message text..."
                    required
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                    <span>Characters: {testMessage.length}</span>
                    <span>Standard cellular SMS: 1 credit per 160 characters</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    type="submit"
                    disabled={isSendingTest}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 shadow-xs"
                  >
                    {isSendingTest ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Dispatching to Carrier...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Send Live Test SMS Now
                      </>
                    )}
                  </Button>

                  <span className="text-xs text-muted-foreground">
                    Sent via: <strong>{activeProviderName}</strong>
                  </span>
                </div>
              </form>

              {/* Real-time result feedback */}
              {testResult && (
                <div
                  className={`rounded-xl border p-4 text-xs space-y-2.5 transition-all ${
                    testResult.success
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                      : "border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-100"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {testResult.success ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      {testResult.success ? "SMS Dispatched Successfully!" : "Dispatch Rejected / Notice"}
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">{testResult.time}</span>
                  </div>

                  <p className="leading-relaxed">{testResult.message}</p>

                  {testResult.error418 && (
                    <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> MSG91 Error 418 IP Restriction:
                      </div>
                      <p>
                        MSG91 account me IP Whitelist enabled hai. MSG91 Dashboard me jakar AuthKey ki IP restriction DISABLE karein, ya server IP whitelist karein:
                      </p>
                      {testResult.serverIp && (
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-background/80 px-2 py-0.5 rounded font-mono font-bold">
                            {testResult.serverIp}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyIp(testResult.serverIp!)}
                            className="text-xs underline font-semibold"
                          >
                            {copiedIp ? "Copied!" : "Copy IP"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {testResult.raw && (
                    <details className="text-[10px] bg-background/50 rounded-md p-2 border border-border/50">
                      <summary className="cursor-pointer font-mono font-semibold opacity-80">
                        View Raw Carrier Response
                      </summary>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono p-1">
                        {typeof testResult.raw === "string" ? testResult.raw : JSON.stringify(testResult.raw, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROVIDERS & CREDENTIALS */}
          {activeTab === "providers" && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                Select your preferred SMS provider and enter credentials. Click <strong>Save & Set Active Gateway</strong> to start sending messages through it.
              </div>

              {/* Provider Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setSelectedProvider("fast2sms")}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all text-center ${
                    selectedProvider === "fast2sms"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ⚡ Fast2SMS
                  <span className="block text-[9px] font-normal text-emerald-500 font-sans">Simple • No DLT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider("msg91")}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all text-center ${
                    selectedProvider === "msg91"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📱 MSG91
                  <span className="block text-[9px] font-normal text-muted-foreground font-sans">Flow & HTTP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider("twilio")}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all text-center ${
                    selectedProvider === "twilio"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🌐 Twilio
                  <span className="block text-[9px] font-normal text-muted-foreground font-sans">Global SMS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider("textlocal")}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all text-center ${
                    selectedProvider === "textlocal"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📩 Textlocal
                  <span className="block text-[9px] font-normal text-muted-foreground font-sans">India / UK</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProvider("custom")}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold transition-all text-center ${
                    selectedProvider === "custom"
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🛠️ Custom API
                  <span className="block text-[9px] font-normal text-muted-foreground font-sans">Any REST URL</span>
                </button>
              </div>

              {/* Provider Config Forms */}
              <form onSubmit={handleSaveActiveConfig} className="space-y-4 pt-1">
                {/* 1. Fast2SMS Form */}
                {selectedProvider === "fast2sms" && (
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Zap className="h-4 w-4 text-emerald-500" />
                        Fast2SMS Gateway Configuration
                      </div>
                      <a
                        href="https://www.fast2sms.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        fast2sms.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Fast2SMS is the easiest option for Indian colleges. <strong>No DLT registration required</strong> for Quick SMS route! Just copy your API Authorization key from Fast2SMS dashboard.
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Fast2SMS Authorization API Key *
                      </label>
                      <Input
                        type="password"
                        placeholder="Paste your Fast2SMS API key here..."
                        value={fast2smsApiKey}
                        onChange={(e) => setFast2smsApiKey(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">SMS Route</label>
                        <select
                          value={fast2smsRoute}
                          onChange={(e) => setFast2smsRoute(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                        >
                          <option value="q">Quick SMS (route=q, No DLT required)</option>
                          <option value="otp">OTP / Fast Delivery (route=otp)</option>
                          <option value="v3">V3 Route (route=v3)</option>
                          <option value="dlt">DLT Approved (route=dlt)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Language Mode</label>
                        <div className="h-9 flex items-center text-xs text-muted-foreground px-2">
                          Auto (English / Marathi / Hindi Unicode supported)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MSG91 Form */}
                {selectedProvider === "msg91" && (
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        MSG91 Gateway Configuration
                      </div>
                      <a
                        href="https://control.msg91.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        msg91.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        MSG91 AuthKey *
                      </label>
                      <Input
                        type="password"
                        placeholder="Enter your MSG91 AuthKey..."
                        value={msg91AuthKey}
                        onChange={(e) => setMsg91AuthKey(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Sender ID</label>
                        <Input
                          placeholder="e.g. EDUTRK"
                          value={msg91SenderId}
                          onChange={(e) => setMsg91SenderId(e.target.value)}
                          maxLength={6}
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Route</label>
                        <Input
                          placeholder="e.g. 4"
                          value={msg91Route}
                          onChange={(e) => setMsg91Route(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Flow Template ID (Optional)
                        </label>
                        <Input
                          placeholder="e.g. 64b8f... (For MSG91 Flow API)"
                          value={msg91TemplateId}
                          onChange={(e) => setMsg91TemplateId(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          DLT Template ID (DLT_TE_ID)
                        </label>
                        <Input
                          placeholder="e.g. 170716..."
                          value={msg91DltTeId}
                          onChange={(e) => setMsg91DltTeId(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Twilio Form */}
                {selectedProvider === "twilio" && (
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Globe className="h-4 w-4 text-purple-500" />
                        Twilio SMS Configuration
                      </div>
                      <a
                        href="https://console.twilio.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        twilio.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Account SID *</label>
                      <Input
                        placeholder="e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={twilioAccountSid}
                        onChange={(e) => setTwilioAccountSid(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Auth Token *</label>
                      <Input
                        type="password"
                        placeholder="Twilio Auth Token"
                        value={twilioAuthToken}
                        onChange={(e) => setTwilioAuthToken(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">From Phone Number *</label>
                      <Input
                        placeholder="e.g. +1234567890"
                        value={twilioFromNumber}
                        onChange={(e) => setTwilioFromNumber(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 4. Textlocal Form */}
                {selectedProvider === "textlocal" && (
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-amber-500" />
                        Textlocal SMS Configuration
                      </div>
                      <a
                        href="https://www.textlocal.in"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        textlocal.in <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Textlocal API Key *</label>
                      <Input
                        type="password"
                        placeholder="Textlocal API Key"
                        value={textlocalApiKey}
                        onChange={(e) => setTextlocalApiKey(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Sender Name</label>
                      <Input
                        placeholder="e.g. TXTLCL"
                        value={textlocalSender}
                        onChange={(e) => setTextlocalSender(e.target.value)}
                        maxLength={6}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* 5. Custom API / Webhook Form */}
                {selectedProvider === "custom" && (
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3.5">
                    <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Code2 className="h-4 w-4 text-emerald-500" />
                      Custom Gateway / Webhook / Any REST API
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use this to connect any SMS gateway in the world (e.g. 2Factor, SMSHorizon, Kaleyra, IndiaSMS). Placeholders: <code>{"{clean10}"}</code>, <code>{"{with91}"}</code>, <code>{"{message}"}</code>, <code>{"{apiKey}"}</code>.
                    </p>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-1 space-y-1">
                        <label className="text-xs font-semibold text-foreground">Method</label>
                        <select
                          value={customMethod}
                          onChange={(e) => setCustomMethod(e.target.value as any)}
                          className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="POST">POST</option>
                          <option value="GET">GET</option>
                        </select>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-xs font-semibold text-foreground">Gateway Endpoint URL *</label>
                        <Input
                          placeholder="https://api.sms-provider.com/v1/send"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          className="font-mono text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Custom Headers (JSON)</label>
                        <textarea
                          rows={3}
                          value={customHeaders}
                          onChange={(e) => setCustomHeaders(e.target.value)}
                          className="w-full rounded-md border border-input bg-background p-2 font-mono text-[11px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">
                          {customMethod === "POST" ? "Payload Template (JSON)" : "Query Parameters"}
                        </label>
                        <textarea
                          rows={3}
                          value={customBody}
                          onChange={(e) => setCustomBody(e.target.value)}
                          className="w-full rounded-md border border-input bg-background p-2 font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Save button and status message */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingConfig}
                    className="font-semibold text-xs bg-primary text-primary-foreground shadow-xs"
                  >
                    {isSavingConfig ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Saving Configuration...
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Save & Set {selectedProvider.toUpperCase()} as Active Gateway
                      </>
                    )}
                  </Button>
                </div>

                {configSaveStatus && (
                  <div
                    className={`rounded-lg p-3 text-xs font-semibold flex items-center gap-2 ${
                      configSaveStatus.startsWith("Success")
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30"
                        : "bg-red-500/15 text-red-800 dark:text-red-200 border border-red-500/30"
                    }`}
                  >
                    <Info className="h-4 w-4 shrink-0" />
                    {configSaveStatus}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 3: GUIDE & IP DIAGNOSTICS */}
          {activeTab === "guide" && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Server Public IP & Whitelisting
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  If your SMS carrier (like MSG91) requires server IP whitelisting or returns Error 418, whitelist this cloud server IP in your carrier account:
                </p>
                <div className="flex items-center gap-2">
                  <code className="bg-background px-3 py-1.5 rounded-lg border border-border font-mono font-bold text-sm text-primary">
                    {status?.serverIp || "34.34.254.233"}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyIp(status?.serverIp || "34.34.254.233")}
                    className="h-8 text-xs font-semibold"
                  >
                    {copiedIp ? <Check className="h-3.5 w-3.5 text-emerald-500 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                    {copiedIp ? "Copied!" : "Copy Server IP"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-foreground">Frequently Asked Questions (FAQ)</h4>

                <div className="rounded-lg border border-border/70 p-3 space-y-1">
                  <div className="font-semibold text-foreground">
                    Q: Muze simple plain SMS bhejna hai bina kisi DLT issue ke. Kaunsa provider use karein?
                  </div>
                  <p className="text-muted-foreground">
                    <strong>Fast2SMS</strong> use karein! Fast2SMS me 30 second me account ban jata hai, aur bina DLT registration ke Quick SMS (route=q) se seedha 10-digit number par real cellular SMS send hota hai.
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 p-3 space-y-1">
                  <div className="font-semibold text-foreground">
                    Q: MSG91 me Error 418 aa raha hai, iska kya solution hai?
                  </div>
                  <p className="text-muted-foreground">
                    MSG91 dashboard me jakar <strong>Authkey</strong> settings kholein. Wahan "IP Restriction" toggle ko <strong>DISABLE</strong> karein, ya upar diya gaya Server IP ({status?.serverIp || "34.34.254.233"}) whitelist karein.
                  </p>
                </div>

                <div className="rounded-lg border border-border/70 p-3 space-y-1">
                  <div className="font-semibold text-foreground">
                    Q: Kya attendence mark karte waqt parents ko automatic message jayega?
                  </div>
                  <p className="text-muted-foreground">
                    Haan! Jab teacher ya admin Absentee mark karte hain, EduTrack background me active SMS provider ke through parents ke registered mobile number par notification bhej deta hai.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const SmsGatewayModal = Msg91SetupModal;
