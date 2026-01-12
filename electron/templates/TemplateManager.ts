import type {
  Template,
  TemplateData,
  TemplateType,
} from "../../src/Shared/Types/PrintTemplate";

/**
 * TemplateManager
 * Manages print templates - registration, retrieval, and HTML generation
 */
export class TemplateManager {
  private templates: Map<TemplateType, Template> = new Map();

  constructor() {
    console.log("[TemplateManager] Initialized");
  }

  /**
   * Register a new template
   */
  register<TData extends TemplateData>(template: Template<TData>): void {
    this.templates.set(template.id, template as Template);
    console.log(`[TemplateManager] Registered template: ${template.id}`);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: TemplateType): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * Get all available templates
   */
  getTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * Generate HTML from template with data
   */
  generateHTML(templateId: TemplateType, data: TemplateData): string {
    const template = this.templates.get(templateId);

    if (!template) {
      const availableTemplates = Array.from(this.templates.keys()).join(", ");
      throw new Error(
        `Template "${templateId}" not found. Available templates: ${availableTemplates}`
      );
    }

    try {
      return template.generate(data);
    } catch (error) {
      console.error(
        `[TemplateManager] Error generating HTML for template ${templateId}:`,
        error
      );
      throw new Error(
        `Failed to generate HTML for template "${templateId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Check if template exists
   */
  hasTemplate(id: TemplateType): boolean {
    return this.templates.has(id);
  }

  /**
   * Get template info (without generate function)
   */
  getTemplateInfo(id: TemplateType) {
    const template = this.templates.get(id);
    if (!template) return undefined;

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      paperSize: template.paperSize,
    };
  }

  /**
   * Get all templates info
   */
  getTemplatesInfo() {
    return Array.from(this.templates.values()).map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      paperSize: template.paperSize,
    }));
  }
}
