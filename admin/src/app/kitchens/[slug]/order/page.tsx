import { redirect } from "next/navigation";

/** Legacy kitchen order URL — cart checkout is the shared flow now. */
export default function KitchenOrderPage() {
  redirect("/cart");
}
