export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  subscriptionStatus: "Active" | "Pending" | "Expired" | "None";
  subscriptionExpiry?: string;
  updatedAt?: string;
}

export interface VocalRequest {
  id: string;
  userId: string;
  userName: string;
  djName: string;
  userText: string;
  voiceType: string;
  status: "Pending" | "Approved" | "Processing" | "Completed" | "Rejected";
  createdAt: string;
  enhancedText?: string;
  audioUrl?: string;
  error?: string;
}

export interface SupportLink {
  id: string;
  title: string;
  url: string;
}

export interface SystemPromptSetting {
  systemPrompt: string;
}
