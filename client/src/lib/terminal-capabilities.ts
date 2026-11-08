import inventory from "./terminal-capabilities.json";

type Inventory = {
  distribution: string;
  kernel: string;
  shell: string;
  busybox: string;
  applets: string[];
  probes: Record<string, boolean>;
};

const measured = inventory as Inventory;
const applets = new Set(measured.applets);

export type CommandAvailability = "available" | "absent" | "not-listed";

export const terminalProfile = `${measured.distribution} · ${measured.kernel} · ${measured.shell} ${measured.busybox}`;
export const terminalAppletCount = measured.applets.length;

export function getCommandAvailability(commandName: string): {
  executable: string;
  availability: CommandAvailability;
} {
  const token = commandName.trim().match(/^[^\s|;&<>]+/)?.[0] ?? "";
  const executable = token.split("/").filter(Boolean).at(-1) ?? token;
  if (!executable) return { executable: "", availability: "not-listed" };
  if (applets.has(executable) || measured.probes[executable] === true) {
    return { executable, availability: "available" };
  }
  if (measured.probes[executable] === false) {
    return { executable, availability: "absent" };
  }
  return { executable, availability: "not-listed" };
}
