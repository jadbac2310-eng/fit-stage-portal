/** 担当者が確認したかどうか */
export type ApplicationStatus = "new" | "done";

export interface MembershipApplication {
  id: string;
  /** 顧客マスタに作った／見つけた顧客。作成に失敗した場合は未設定 */
  customerId?: string;
  storeId?: string;
  storeName?: string;

  fullName: string;
  fullNameKana?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  email?: string;
  postalCode?: string;
  address?: string;

  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;

  plan?: string;
  paymentMethod?: string;

  /** 健康状態は「ある／ない」だけ。詳しい内容は初回に口頭で伺う */
  healthCondition?: string;
  healthMedicine?: string;
  healthInjury?: string;
  healthMaternity: boolean;
  /** 自由記入。「ある／ない」では拾えない、気をつけてほしいこと */
  healthNote?: string;

  /** 18歳未満の方の保護者の同意 */
  guardianName?: string;
  guardianRelation?: string;
  guardianConsent: boolean;

  photoConsent?: string;
  requestNote?: string;

  agreedToTerms: boolean;
  /** 個人情報の取り扱いへの同意。会員規約とは別のチェック項目 */
  agreedToPrivacy: boolean;
  agreedAt?: string;
  signatureName?: string;

  status: ApplicationStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  new:  "未対応",
  done: "対応済み",
};

/** 健康状態に1つでも「ある」が付いているか（一覧で目印を出すのに使う） */
export function hasHealthFlag(a: MembershipApplication): boolean {
  return (
    a.healthCondition === "ある" ||
    a.healthMedicine === "ある" ||
    a.healthInjury === "ある" ||
    a.healthMaternity ||
    (a.healthNote ?? "").trim() !== ""
  );
}
