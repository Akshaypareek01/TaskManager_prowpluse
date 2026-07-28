import Wall from "./Wall";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialState = await getState();
  return <Wall initialState={initialState} />;
}
