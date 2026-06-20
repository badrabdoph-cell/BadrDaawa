import type { ReactNode } from "react";
import styles from "./order-visual-polish.module.css";

export default function OrderLayout({ children }: { children: ReactNode }) {
  return <div className={styles.scope}>{children}</div>;
}
