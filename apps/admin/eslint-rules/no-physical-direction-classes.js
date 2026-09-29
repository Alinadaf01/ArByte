// RTL guard: ban physical-direction Tailwind utilities in string literals
// (className="…", cn("…")) in favor of logical ones (ps-/pe-/ms-/me-/
// start-/end-/text-start/text-end).
const PHYSICAL = /^-?(?:pl|pr|ml|mr|left|right)-|^text-(?:left|right)$/;

function check(context, node, text) {
  for (const token of text.split(/\s+/)) {
    const base = token.split(":").pop();
    if (base && PHYSICAL.test(base)) {
      context.report({
        node,
        message: `Physical-direction utility "${base}" is not allowed in this RTL app; use a logical one (ps-/pe-/ms-/me-/start-/end-/text-start/text-end).`,
      });
    }
  }
}

export default {
  rules: {
    "no-physical-direction-classes": {
      meta: { type: "problem", schema: [] },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === "string")
              check(context, node, node.value);
          },
          TemplateElement(node) {
            check(context, node, node.value.cooked ?? "");
          },
        };
      },
    },
  },
};
