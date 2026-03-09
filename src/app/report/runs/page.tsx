import { redirect } from "next/navigation";

export default function RunsPage() {
  redirect("/report/template?tab=export");
}
