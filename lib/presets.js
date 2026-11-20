import web from "./presets-web";
import pwn from "./presets-pwn";
import webExtra, { webPayloads, webCommands } from "./presets-extra-web";
import pwnExtra, { pwnPayloads, pwnCommands } from "./presets-extra-pwn";

const payloads = { ...webPayloads, ...pwnPayloads };
const commands = { ...webCommands, ...pwnCommands };

const presets = [...web, ...pwn, ...webExtra, ...pwnExtra].map((template) => ({
  ...template,
  payloads: [...(template.payloads || []), ...(payloads[template.id] || [])],
  commands: [...(template.commands || []), ...(commands[template.id] || [])]
}));

export default presets;
