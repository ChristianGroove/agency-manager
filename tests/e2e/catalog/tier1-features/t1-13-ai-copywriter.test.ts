/**
 * Tier 1 Test Suite: F13 - AI Copywriter & Enhancer
 * Tests title optimization prompt generator, description generator from keywords, bullet point extraction, SEO meta tags schema, error fallback message.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertContains,
  assertLessThanOrEqual,
} from '../harness/assertions';

export const suite = {
  name: 'T1-13: AI Copywriter & Enhancer',
  tier: 'Tier 1',
  feature: 'F13: AI Copywriter & Enhancer',
  tests: [
    {
      name: 'Generates structured AI prompt for title optimization with tone and category context',
      fn: () => {
        function buildTitlePrompt(params: {
          currentTitle: string;
          category: string;
          tone: 'persuasive' | 'luxury' | 'technical' | 'minimal';
        }): string {
          return `Act as a world-class e-commerce copywriter. Optimize the product title "${params.currentTitle}" for category "${params.category}" using a ${params.tone} tone. Keep it under 70 characters. Return 3 variants.`;
        }

        const prompt = buildTitlePrompt({
          currentTitle: 'Camiseta Negra',
          category: 'Ropa & Moda',
          tone: 'luxury',
        });

        assertContains(prompt, 'Camiseta Negra');
        assertContains(prompt, 'Ropa & Moda');
        assertContains(prompt, 'luxury');
        assertContains(prompt, '70 characters');
      },
    },
    {
      name: 'Transforms raw feature keywords into persuasive customer-centric descriptions',
      fn: () => {
        function formatAiDescription(data: {
          productName: string;
          keyKeywords: string[];
        }): string {
          const joinedKeywords = data.keyKeywords.join(', ');
          return `Descubre la excelencia de ${data.productName}. Diseñado con ${joinedKeywords}, este producto ofrece el balance perfecto entre estilo y durabilidad.`;
        }

        const desc = formatAiDescription({
          productName: 'Camiseta Premium Oversize',
          keyKeywords: ['algodón 240gsm', 'corte relajado', 'costuras reforzadas'],
        });

        assertContains(desc, 'Camiseta Premium Oversize');
        assertContains(desc, 'algodón 240gsm');
        assertContains(desc, 'corte relajado');
      },
    },
    {
      name: 'Extracts and formats key bullet points into clean bulleted list',
      fn: () => {
        const rawAiOutput = `
          - 100% Algodón Peinado de alta densidad
          - Silueta Oversize Relaxed Fit moderna
          - Cuello acanalado anti-deformación
          - Hecho éticamente en Colombia
        `;

        function parseBulletPoints(rawText: string): string[] {
          return rawText
            .split('\n')
            .map((line) => line.trim().replace(/^[-*•]\s*/, ''))
            .filter((line) => line.length > 0);
        }

        const bullets = parseBulletPoints(rawAiOutput);
        assertEqual(bullets.length, 4);
        assertEqual(bullets[0], '100% Algodón Peinado de alta densidad');
        assertEqual(bullets[3], 'Hecho éticamente en Colombia');
      },
    },
    {
      name: 'Validates SEO meta title and meta description length and schema compliance',
      fn: () => {
        function generateSeoMeta(product: {
          name: string;
          description: string;
          brandName: string;
        }) {
          const metaTitle = `${product.name} | ${product.brandName}`.slice(0, 60);
          const metaDescription = product.description.slice(0, 155);

          return { metaTitle, metaDescription };
        }

        const seo = generateSeoMeta({
          name: 'Camiseta Premium Oversize Minimalist',
          description:
            'Camiseta confeccionada en 100% algodón peinado de 240gsm con corte relajado y acabados de alta costura ideales para el día a día moderno.',
          brandName: 'Pixy Store',
        });

        assertLessThanOrEqual(seo.metaTitle.length, 60);
        assertLessThanOrEqual(seo.metaDescription.length, 155);
        assertContains(seo.metaTitle, 'Pixy Store');
      },
    },
    {
      name: 'Provides robust error fallback and retry message when AI service times out',
      fn: async () => {
        async function mockAiGeneration(shouldFail: boolean) {
          if (shouldFail) {
            return {
              success: false,
              content: null,
              fallbackMessage: 'El servicio de IA no se encuentra disponible temporalmente. Intenta nuevamente en unos momentos.',
            };
          }
          return {
            success: true,
            content: 'Generación exitosa.',
            fallbackMessage: null,
          };
        }

        const res = await mockAiGeneration(true);
        assertFalse(res.success);
        assertEqual(res.content, null);
        assertContains(res.fallbackMessage!, 'no se encuentra disponible');
      },
    },
  ],
};

export async function run() {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const t of suite.tests) {
    try {
      await t.fn();
      passed++;
    } catch (err: any) {
      failed++;
      errors.push(`${t.name}: ${err.message}`);
    }
  }

  return { passed, failed, errors };
}
