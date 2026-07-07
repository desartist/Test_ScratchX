// Content for the Platform Usage & Subscription Notice consent gate.
// Bump PLATFORM_NOTICE_VERSION whenever the text changes below to force
// existing users to re-accept.
export const PLATFORM_NOTICE_VERSION = "2026-07-04";

const NOT_GAMBLING_LIST = [
  "Gambling",
  "Betting",
  "Lottery",
  "Wagering",
  "Casino-style activity",
  "Money game",
  "Paid lucky draw",
  "Illegal winning platform",
  "Prize-based illegal scheme",
  "Any chance-based financial game",
];

export const MERCHANT_POLICY = {
  title: "Important Platform Usage & Subscription Notice",
  subtitle: "Please read and confirm before continuing to your ScratchX Retailer Dashboard.",
  sections: [
    {
      heading: "1. Important Platform Usage Notice",
      blocks: [
        { type: "p", text: "ScratchX is not a gambling, betting, lottery, wagering, casino, illegal winning, or money-game platform." },
        { type: "p", text: "ScratchX is a digital retail rewards and customer engagement platform created only to help retailers grow their business through genuine promotional campaigns, customer rewards, loyalty offers, cashback, discounts, coupons, gifts, and repeat-customer engagement." },
        { type: "p", text: "Retailers must not use, promote, describe, or communicate ScratchX as:" },
        { type: "ul", items: NOT_GAMBLING_LIST },
        { type: "p", text: "ScratchX campaigns must be connected to genuine retail business activity and lawful customer engagement." },
        { type: "p", text: "Retailers must not collect money from customers in exchange for a chance to win rewards, prizes, cashback, gifts, discounts, or any other benefit." },
        { type: "p", text: "All ScratchX terms, conditions, platform usage rules, privacy policies, campaign rules, and compliance requirements also apply to Staff, Store Managers, team members, or any authorized users added under the retailer account." },
        { type: "p", text: "Retailers are responsible for all activity performed by their Staff, Store Managers, team members, or authorized users through the ScratchX Retailer Dashboard." },
        { type: "p", text: "Retailers must ensure that Staff, Store Managers, team members, or authorized users do not misuse ScratchX, create misleading campaigns, promote ScratchX as gambling or illegal winning, manipulate campaigns, misuse customer data, or violate any ScratchX policy." },
        { type: "p", text: "Any misuse of ScratchX for gambling, betting, lottery, illegal winning activities, fake prize schemes, misleading reward claims, unauthorized account activity, staff misuse, or unlawful promotions may result in immediate campaign removal, account restriction, account suspension, or permanent termination from the platform." },
      ],
    },
    {
      heading: "2. Subscription Notice",
      blocks: [
        { type: "p", text: "ScratchX charges a one-time lifetime platform usage fee for retailer access to the platform." },
        { type: "p", text: "This lifetime platform usage fee provides access to the ScratchX Retailer Dashboard and platform features as per the selected plan, subject to ScratchX terms, fair usage rules, and active scratch availability." },
        { type: "p", text: "As part of the onboarding benefit, the first month includes unlimited scratches for campaign usage." },
        { type: "p", text: "From the second month onward, retailers must recharge or purchase a scratch plan to continue creating, running, and managing scratch campaigns on ScratchX." },
        { type: "p", text: "Retailers understand and agree that the lifetime platform usage fee provides access to the ScratchX platform, but does not include unlimited scratches for lifetime." },
        { type: "p", text: "Unlimited scratches are available only for the first month from the date of activation, unless otherwise communicated by ScratchX in writing." },
        { type: "p", text: "After the first month, continued campaign creation and scratch usage will depend on an active scratch recharge plan, scratch balance, or subscribed scratch package." },
        { type: "p", text: "If a retailer does not recharge or maintain an active scratch plan after the first month, they may not be able to create new campaigns or continue campaign activity that requires scratches." },
        { type: "p", text: "ScratchX may update scratch plans, pricing, limits, recharge options, and campaign usage terms from time to time." },
      ],
    },
    {
      heading: "3. Confirmation",
      blocks: [
        { type: "p", text: "By continuing, you confirm that you understand and agree that ScratchX is strictly a retail rewards and customer engagement platform, not a gambling, betting, lottery, illegal winning, or money-game platform." },
        { type: "p", text: "You also confirm that you understand and agree that all ScratchX terms and conditions apply to the retailer account, including all Staff, Store Managers, team members, and authorized users added under the account." },
        { type: "p", text: "You further confirm that you understand the lifetime platform usage fee, the first-month unlimited scratch benefit, and the requirement to recharge a scratch plan from the second month onward to continue creating campaigns." },
      ],
    },
  ],
  checkboxLabel: "I confirm that I have read and agree to the Important Platform Usage & Subscription Notice.",
  buttonLabel: "I Agree & Continue",
};

export const DISTRIBUTOR_POLICY = {
  title: "Important Platform Usage & Subscription Notice",
  subtitle: "Please read and confirm before continuing to your ScratchX Distributor Dashboard.",
  sections: [
    {
      heading: "1. Important Platform Usage Notice",
      blocks: [
        { type: "p", text: "ScratchX is not a gambling, betting, lottery, wagering, casino, illegal winning, or money-game platform." },
        { type: "p", text: "ScratchX is a digital retail rewards and customer engagement platform created only to help retailers grow their business through genuine promotional campaigns, customer rewards, loyalty offers, cashback, discounts, coupons, gifts, and repeat-customer engagement." },
        { type: "p", text: "Retailers must not use, promote, describe, or communicate ScratchX as:" },
        { type: "ul", items: NOT_GAMBLING_LIST },
        { type: "p", text: "ScratchX campaigns must be connected to genuine retail business activity and lawful customer engagement." },
        { type: "p", text: "Retailers must not collect money from customers in exchange for a chance to win rewards, prizes, cashback, gifts, discounts, or any other benefit." },
        { type: "p", text: "Any misuse of ScratchX for gambling, betting, lottery, illegal winning activities, fake prize schemes, misleading reward claims, or unlawful promotions may result in immediate campaign removal, account suspension, or permanent termination from the platform." },
      ],
    },
    {
      heading: "2. Subscription Notice",
      blocks: [
        { type: "p", text: "ScratchX charges a one-time lifetime platform usage fee for retailer access to the platform." },
        { type: "p", text: "This lifetime platform usage fee provides access to the ScratchX Retailer Dashboard and platform features as per the selected plan, subject to ScratchX terms, fair usage rules, and active scratch availability." },
        { type: "p", text: "As part of the onboarding benefit, the first month includes unlimited scratches for campaign usage." },
        { type: "p", text: "From the second month onward, retailers must recharge or purchase a scratch plan to continue creating, running, and managing scratch campaigns on ScratchX." },
        { type: "p", text: "Retailers understand and agree that the lifetime platform usage fee provides access to the ScratchX platform, but does not include unlimited scratches for lifetime." },
        { type: "p", text: "Unlimited scratches are available only for the first month from the date of activation, unless otherwise communicated by ScratchX in writing." },
        { type: "p", text: "After the first month, continued campaign creation and scratch usage will depend on an active scratch recharge plan, scratch balance, or subscribed scratch package." },
        { type: "p", text: "If a retailer does not recharge or maintain an active scratch plan after the first month, they may not be able to create new campaigns or continue campaign activity that requires scratches." },
        { type: "p", text: "ScratchX may update scratch plans, pricing, limits, recharge options, and campaign usage terms from time to time." },
      ],
    },
    {
      heading: "3. Confirmation",
      blocks: [
        { type: "p", text: "By continuing, you confirm that you understand and agree that ScratchX is strictly a retail rewards and customer engagement platform, not a gambling, betting, lottery, illegal winning, or money-game platform." },
        { type: "p", text: "You also confirm that you understand the lifetime platform usage fee, the first-month unlimited scratch benefit, and the requirement to recharge a scratch plan from the second month onward to continue creating campaigns." },
      ],
    },
  ],
  checkboxLabel: "I confirm that I have read and agree to the Important Platform Usage & Subscription Notice.",
  buttonLabel: "I Agree & Continue",
};

export function getPlatformNoticeForRole(role) {
  if (role === "Merchant") return MERCHANT_POLICY;
  if (role === "Distributor") return DISTRIBUTOR_POLICY;
  return null;
}
