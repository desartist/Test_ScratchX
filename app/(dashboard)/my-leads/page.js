// A Sales_Executive's home page — literally the same Leads list/detail UI
// as the Distributor's /leads page. No duplication needed: the underlying
// API (app/api/distributor/leads) already scopes a Sales_Executive's view
// to only the leads assigned to them (see scopeFor() in that route), and
// the page component itself already hides Distributor-only controls
// (reassignment, "Mark Not Interested", the executive filter/column) when
// account.role isn't Distributor/Super_Admin.
export { default } from "@/app/(dashboard)/leads/page";
