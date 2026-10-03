import { PilotConsole } from "@/components/admin/PilotConsole";
export const metadata = {
  title: "Operations · Daytona Car Rentals",
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return <PilotConsole />;
}
