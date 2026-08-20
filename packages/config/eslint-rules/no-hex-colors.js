"use strict";

// Brand Book 12.86 / ADR-001 §"قواعد الزامی" rule 1:
// no HEX color literal may appear in component source — only semantic tokens.
const HEX_COLOR = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

function report(context, node) {
  context.report({
    node,
    messageId: "noHex",
  });
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow HEX color literals in component files — use semantic design tokens instead.",
    },
    schema: [],
    messages: {
      noHex:
        "رنگ HEX در کامپوننت مجاز نیست — از توکن سمنتیک استفاده کن (packages/tokens). No HEX colors in component files — use a semantic token instead.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === "string" && HEX_COLOR.test(node.value)) {
          report(context, node);
        }
      },
      TemplateElement(node) {
        const raw = node.value && node.value.raw;
        if (typeof raw === "string" && HEX_COLOR.test(raw)) {
          report(context, node);
        }
      },
      JSXText(node) {
        if (typeof node.value === "string" && HEX_COLOR.test(node.value)) {
          report(context, node);
        }
      },
    };
  },
};
