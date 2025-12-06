import { useState, useEffect } from "react";
import { User, Bell, Palette, Shield, Snowflake, Sun, Flame, Check, Loader2, Camera, Lock, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useProfile, useUpdateProfile, useUpdatePersona } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCheckNickname } from "@/hooks/useCheckNickname";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { PasswordChange } from "@/components/profile/PasswordChange";
import type { ChatPersona } from "@/types/domain";

const personas: { id: ChatPersona; icon: typeof Snowflake; label: string; description: string }[] = [
  {
    id: "cold",
    icon: Snowflake,
    label: "Cool & Factual",
    description: "Minimal emotions, short & direct responses",
  },
  {
    id: "bright",
    icon: Sun,
    label: "Warm & Supportive",
    description: "Encouraging, positive feedback with emojis",
  },
  {
    id: "strict",
    icon: Flame,
    label: "Direct & Focused",
    description: "No-nonsense, straightforward coaching",
  },
];

export default function Settings() {
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile();
  const { mutate: updatePersona, isPending: isUpdatingPersona } = useUpdatePersona();
  const { signOut } = useAuth();
  const { toast } = useToast();

  // Form state
  const [heightCm, setHeightCm] = useState("");
  const [goalWeightKg, setGoalWeightKg] = useState("");
  const [targetCalories, setTargetCalories] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<ChatPersona>("bright");
  const [nickname, setNickname] = useState("");
  const [isNicknameEditing, setIsNicknameEditing] = useState(false);
  // Pass user_id to exclude own nickname when checking
  const { status: nicknameStatus, message: nicknameMessage, checkNickname, reset: resetNicknameCheck } = useCheckNickname(profile?.user_id);
  const [notifications, setNotifications] = useState({
    meals: true,
    medications: true,
    weight: false,
    insights: true,
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setHeightCm(profile.height_cm?.toString() || "");
      setGoalWeightKg(profile.goal_weight_kg?.toString() || "");
      setTargetCalories(profile.target_calories?.toString() || "");
      setSelectedPersona(profile.coach_persona || "bright");
      setNickname(profile.nickname || "");
    }
  }, [profile]);

  // Check nickname when editing
  useEffect(() => {
    if (isNicknameEditing && nickname && nickname !== profile?.nickname) {
      checkNickname(nickname);
    }
  }, [nickname, isNicknameEditing, profile?.nickname, checkNickname]);

  const handleSave = () => {
    // Validate nickname if changed
    if (nickname !== profile?.nickname) {
      if (nicknameStatus === 'taken') {
        toast({
          title: "오류",
          description: "이미 사용 중인 닉네임입니다.",
          variant: "destructive",
        });
        return;
      }
      if (nicknameStatus === 'invalid') {
        toast({
          title: "오류",
          description: nicknameMessage,
          variant: "destructive",
        });
        return;
      }
    }

    // Update profile
    updateProfile(
      {
        height_cm: heightCm ? parseFloat(heightCm) : undefined,
        goal_weight_kg: goalWeightKg ? parseFloat(goalWeightKg) : undefined,
        target_calories: targetCalories ? parseInt(targetCalories) : undefined,
        nickname: nickname || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: "Settings saved",
            description: "Your profile has been updated successfully.",
          });
          setIsNicknameEditing(false);
          resetNicknameCheck();
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: "Failed to save settings. Please try again.",
            variant: "destructive",
          });
          console.error("Failed to update profile:", error);
        },
      }
    );

    // Update persona separately
    if (selectedPersona !== profile?.coach_persona) {
      updatePersona(selectedPersona);
    }
  };

  const handleNicknameCancel = () => {
    setNickname(profile?.nickname || "");
    setIsNicknameEditing(false);
    resetNicknameCheck();
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (isLoadingProfile) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your experience</p>
      </div>

      {/* Profile Image Section */}
      <section className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">프로필 이미지</h2>
        </div>

        <AvatarUpload
          currentAvatarUrl={profile?.avatar_url}
          name={profile?.nickname}
          email={profile?.email}
          onUploadComplete={() => {
            toast({
              title: "프로필 이미지 변경",
              description: "프로필 이미지가 업데이트되었습니다.",
            });
          }}
          onDeleteComplete={() => {
            toast({
              title: "프로필 이미지 삭제",
              description: "프로필 이미지가 삭제되었습니다.",
            });
          }}
        />
      </section>

      {/* Nickname & Profile Section */}
      <section className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">프로필 정보</h2>
        </div>

        <div className="space-y-4">
          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <div className="relative">
              <Input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setIsNicknameEditing(true);
                }}
                placeholder="닉네임 입력"
                className={cn(
                  "rounded-xl pr-10",
                  isNicknameEditing && nicknameStatus === 'available' && "border-green-500",
                  isNicknameEditing && (nicknameStatus === 'taken' || nicknameStatus === 'invalid') && "border-destructive"
                )}
              />
              {isNicknameEditing && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {nicknameStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  {nicknameStatus === 'available' && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {nicknameStatus === 'taken' && (
                    <X className="w-4 h-4 text-destructive" />
                  )}
                  {nicknameStatus === 'invalid' && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
              )}
            </div>
            {isNicknameEditing && nicknameMessage && (
              <p className={cn(
                "text-sm",
                nicknameStatus === 'available' ? "text-green-600" : "text-destructive"
              )}>
                {nicknameMessage}
              </p>
            )}
            {isNicknameEditing && nickname !== profile?.nickname && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleNicknameCancel}
              >
                취소
              </Button>
            )}
          </div>

          {/* Height & Goal Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height">키 (cm)</Label>
              <Input
                id="height"
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="175"
                className="rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="goalWeight">목표 체중 (kg)</Label>
              <Input
                id="goalWeight"
                type="number"
                value={goalWeightKg}
                onChange={(e) => setGoalWeightKg(e.target.value)}
                placeholder="68"
                className="rounded-xl mt-1.5"
              />
            </div>
          </div>

          {/* Target Calories */}
          <div>
            <Label htmlFor="targetCalories">목표 칼로리</Label>
            <Input
              id="targetCalories"
              type="number"
              value={targetCalories}
              onChange={(e) => setTargetCalories(e.target.value)}
              placeholder="1800"
              className="rounded-xl mt-1.5"
            />
          </div>
        </div>
      </section>

      {/* Coach Persona Section */}
      <section className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Coach Persona</h2>
            <p className="text-xs text-muted-foreground">Choose your coaching style</p>
          </div>
        </div>

        <div className="space-y-3">
          {personas.map((persona) => {
            const Icon = persona.icon;
            const isSelected = selectedPersona === persona.id;

            return (
              <button
                key={persona.id}
                onClick={() => setSelectedPersona(persona.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{persona.label}</p>
                  <p className="text-xs text-muted-foreground">{persona.description}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Notifications Section */}
      <section className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-info" />
          </div>
          <h2 className="font-semibold text-foreground">Notifications</h2>
        </div>

        <div className="space-y-4">
          {[
            { key: "meals", label: "Meal reminders", description: "Daily reminders to log meals" },
            { key: "medications", label: "Medication alerts", description: "Never miss a dose" },
            { key: "weight", label: "Weight check-ins", description: "Weekly weight logging reminder" },
            { key: "insights", label: "AI insights", description: "Weekly summary notifications" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                checked={notifications[item.key as keyof typeof notifications]}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, [item.key]: checked }))
                }
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          * Notification settings are saved locally. Push notifications coming soon!
        </p>
      </section>

      {/* Password Change Section */}
      <section className="bg-card rounded-2xl border border-border p-6 mb-6 animate-slide-up" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-warning" />
          </div>
          <h2 className="font-semibold text-foreground">비밀번호 변경</h2>
        </div>

        <PasswordChange />
      </section>

      {/* Account Section */}
      <section className="bg-card rounded-2xl border border-border p-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="font-semibold text-foreground">계정</h2>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full justify-start rounded-xl"
          >
            로그아웃
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
            disabled
          >
            계정 삭제 (준비 중)
          </Button>
        </div>
      </section>

      {/* Save Button */}
      <div className="mt-6">
        <Button
          onClick={handleSave}
          disabled={isUpdatingProfile || isUpdatingPersona}
          className="w-full rounded-xl shadow-glow"
        >
          {isUpdatingProfile || isUpdatingPersona ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
