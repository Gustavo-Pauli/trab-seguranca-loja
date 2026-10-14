export type User = {
  id: string;
  name: string;
  email: string;
};

export type AuthChallenge = {
  mode: 'enroll' | 'login';
  challengeToken: string;
  qrCodeDataUrl?: string;
  manualSecret?: string;
};
