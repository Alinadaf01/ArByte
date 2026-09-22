import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";

function Sample() {
  return (
    <Tabs defaultValue="orders">
      <TabsList>
        <TabsTrigger value="orders">سفارش‌ها</TabsTrigger>
        <TabsTrigger value="addresses">آدرس‌ها</TabsTrigger>
      </TabsList>
      <TabsContent value="orders">فهرست سفارش‌ها</TabsContent>
      <TabsContent value="addresses">فهرست آدرس‌ها</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("با کلیک تب فعال و محتوای متناظر نشان داده می‌شود", async () => {
    render(<Sample />);
    expect(screen.getByText("فهرست سفارش‌ها")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "آدرس‌ها" }));
    expect(screen.getByText("فهرست آدرس‌ها")).toBeInTheDocument();
  });

  it("با فلش کیبورد بین تب‌ها جابه‌جا می‌شود", async () => {
    render(<Sample />);
    const first = screen.getByRole("tab", { name: "سفارش‌ها" });
    first.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "آدرس‌ها" })).toHaveFocus();
  });
});
