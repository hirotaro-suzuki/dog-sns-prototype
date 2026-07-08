export type StoreSessionFrame = {
  id: string;
  frameName: string;
  frameUrl: string;
  isDefault: boolean;
  dateEnabled: boolean;
  dateX: number;
  dateY: number;
  dateFontSize: number;
  dateColor: string;
};

export type StoreSessionStore = {
  id: string;
  storeCode: string;
  storeName: string;
  displayName: string;
  logoUrl: string | null;
  frameUrl: string | null;
  frames: StoreSessionFrame[];
  themeColor: string | null;
  printTemplateType: string;
  timezone: string;
  snsDisplayName: string | null;
  instagramAccount: string | null;
  defaultHashtags: string | null;
};

export type StoreSessionStaff = {
  id: string;
  staffCode: string;
  displayName: string;
};

export type StoreSession = {
  store: StoreSessionStore;
  staffMembers: StoreSessionStaff[];
  loggedInAt: string;
};
