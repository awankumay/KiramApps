import { TemplateManager } from "./TemplateManager";
import { receiptTemplate } from "./receipt-template";
import { suratKirimTemplate } from "./surat-kirim-template";
import type {
  Template,
  TemplateData,
} from "../../src/Shared/Types/PrintTemplate";

/**
 * Create and initialize TemplateManager with default templates
 */
export function createTemplateManager(): TemplateManager {
  const manager = new TemplateManager();

  // Register default templates
  manager.register(receiptTemplate as unknown as Template<TemplateData>);
  manager.register(suratKirimTemplate as unknown as Template<TemplateData>);

  console.log(
    `[Templates] Registered ${manager.getTemplates().length} templates`
  );

  return manager;
}

export { TemplateManager };
export * from "./receipt-template";
export * from "./surat-kirim-template";
