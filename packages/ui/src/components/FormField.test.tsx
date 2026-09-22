import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "./FormField";
import { Input } from "./Input";

describe("FormField", () => {
  it("label به فیلد داخلی متصل است", () => {
    render(
      <FormField label="نام">
        <Input />
      </FormField>,
    );
    expect(screen.getByLabelText("نام")).toBeInTheDocument();
  });

  it("required ستاره نشان می‌دهد", () => {
    render(
      <FormField label="نام" required>
        <Input />
      </FormField>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("helpText وقتی errorText نیست نمایش داده می‌شود", () => {
    render(
      <FormField label="نام" helpText="نام و نام خانوادگی">
        <Input />
      </FormField>,
    );
    expect(screen.getByText("نام و نام خانوادگی")).toBeInTheDocument();
  });
});
