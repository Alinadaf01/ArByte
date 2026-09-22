"use client";

import { useState } from "react";
import { Heart, ShoppingCart, Check as CheckIcon } from "lucide-react";
import {
  condition,
  cta,
  devShowcase,
  inventory,
  orderStatus,
} from "@arbyte/contracts";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Checkbox,
  Divider,
  Drawer,
  EmptyState,
  FormField,
  Input,
  Modal,
  Pagination,
  Radio,
  Select,
  Sheet,
  Skeleton,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Toast,
  Tooltip,
  type SelectOption,
} from "@arbyte/ui";

const t = devShowcase;

const SELECT_OPTIONS: SelectOption[] = [
  { value: "gaming", label: "گیمینگ" },
  { value: "pro", label: "حرفه‌ای" },
  { value: "ultrabook", label: "اولترابوک" },
  { value: "monitor", label: "مانیتور" },
];

const MANY_OPTIONS: SelectOption[] = [
  { value: "msi", label: "MSI" },
  { value: "asus", label: "ASUS" },
  { value: "lenovo", label: "Lenovo" },
  { value: "apple", label: "Apple" },
  { value: "dell", label: "Dell" },
  { value: "hp", label: "HP" },
  { value: "acer", label: "Acer" },
  { value: "samsung", label: "Samsung" },
  { value: "lg", label: "LG" },
  { value: "sony", label: "Sony" },
  { value: "razer", label: "Razer" },
  { value: "gigabyte", label: "Gigabyte" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-subhead text-primary font-heading">{title}</h2>
      <Card className="flex flex-col gap-5">{children}</Card>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export default function ComponentsShowcasePage() {
  const [singleValue, setSingleValue] = useState<string | undefined>(undefined);
  const [multiValue, setMultiValue] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [radioValue, setRadioValue] = useState("express");
  const [switchOn, setSwitchOn] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  return (
    <div dir="rtl" className="flex flex-col gap-8 pb-16">
      <h1 className="text-h2 text-primary font-heading">{t.pageTitle}</h1>

      <Breadcrumb
        items={[
          { label: t.demo.breadcrumbHome, href: "/" },
          { label: t.demo.breadcrumbCategory, href: "/laptop" },
          { label: t.demo.breadcrumbCurrent },
        ]}
      />

      <Section title={t.sections.buttons}>
        {(
          ["primary", "secondary", "outline", "ghost", "destructive"] as const
        ).map((variant) => (
          <div key={variant} className="flex flex-col gap-2">
            <p className="text-caption text-secondary">{variant}</p>
            <Row>
              {(["sm", "md", "lg"] as const).map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {cta.addToCart}
                </Button>
              ))}
              <Button variant={variant} disabled>
                {cta.addToCart}
              </Button>
              <Button
                variant={variant}
                loading={loading}
                loadingText="در حال ثبت..."
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 1500);
                }}
              >
                {cta.checkout}
              </Button>
              <Button
                variant={variant}
                icon={<ShoppingCart size={16} aria-hidden="true" />}
              >
                {cta.addToCart}
              </Button>
            </Row>
          </div>
        ))}
      </Section>

      <Section title={t.sections.formFields}>
        <Row>
          <FormField label={t.demo.orderNumberLabel} className="w-64">
            <Input
              dir="ltr"
              defaultValue={t.demo.orderNumberValue}
              className="text-end"
            />
          </FormField>
          <FormField label={t.demo.mobileLabel} className="w-64">
            <Input type="tel" placeholder={t.demo.mobilePlaceholder} />
          </FormField>
          <FormField
            label={t.demo.mobileLabel}
            errorText={t.demo.errorText}
            className="w-64"
          >
            <Input type="tel" defaultValue="0912345678" />
          </FormField>
          <FormField
            label={t.demo.mobileLabel}
            helpText={t.demo.helpText}
            className="w-64"
          >
            <Input type="tel" />
          </FormField>
        </Row>
        <FormField label={t.demo.textareaLabel} className="max-w-md">
          <Textarea placeholder={t.demo.textareaLabel} />
        </FormField>
        <Row>
          <Checkbox
            label={t.demo.checkboxLabel}
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <Switch
            label={t.demo.switchLabel}
            checked={switchOn}
            onChange={(e) => setSwitchOn(e.target.checked)}
          />
        </Row>
        <div className="flex flex-col gap-2">
          <p className="text-caption text-secondary">
            {t.demo.radioGroupLabel}
          </p>
          <Row>
            <Radio
              name="shipping"
              value="express"
              label={t.demo.radioExpress}
              checked={radioValue === "express"}
              onChange={() => setRadioValue("express")}
            />
            <Radio
              name="shipping"
              value="standard"
              label={t.demo.radioStandard}
              checked={radioValue === "standard"}
              onChange={() => setRadioValue("standard")}
            />
          </Row>
        </div>
      </Section>

      <Section title={t.sections.select}>
        <Row>
          <FormField label={t.demo.selectLabel} className="w-64">
            <Select
              options={SELECT_OPTIONS}
              value={singleValue}
              onValueChange={setSingleValue}
              placeholder={t.demo.selectPlaceholder}
              aria-label={t.demo.selectLabel}
              sheetTitle={t.demo.selectLabel}
            />
          </FormField>
          <FormField label={t.demo.multiSelectLabel} className="w-72">
            <Select
              multiple
              options={MANY_OPTIONS}
              value={multiValue}
              onValueChange={setMultiValue}
              placeholder={t.demo.multiSelectPlaceholder}
              aria-label={t.demo.multiSelectLabel}
              sheetTitle={t.demo.multiSelectLabel}
            />
          </FormField>
        </Row>
      </Section>

      <Section title={t.sections.card}>
        <Row>
          <Card variant="flat" className="w-56">
            {t.demo.cardFlatTitle}
          </Card>
          <Card variant="raised" className="w-56">
            {t.demo.cardRaisedTitle}
          </Card>
          <Card variant="interactive" className="w-56">
            {t.demo.cardInteractiveTitle}
          </Card>
        </Row>
      </Section>

      <Section title={t.sections.badge}>
        <div className="flex flex-col gap-2">
          <p className="text-caption text-secondary">
            {t.demo.conditionGroupLabel}
          </p>
          <Row>
            <Badge tone="neutral">{condition.sealed}</Badge>
            <Badge tone="neutral">{condition.openBox}</Badge>
            <Badge tone="neutral">{condition.stock}</Badge>
            <Badge tone="neutral">{condition.likeNew}</Badge>
          </Row>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-caption text-secondary">
            {t.demo.availabilityGroupLabel}
          </p>
          <Row>
            <Badge tone="success">{inventory.inStock}</Badge>
            <Badge tone="warning">{inventory.limitedStock}</Badge>
            <Badge tone="neutral">{inventory.outOfStock}</Badge>
            <Badge tone="info">{inventory.comingSoon}</Badge>
          </Row>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-caption text-secondary">
            {t.demo.orderStatusGroupLabel}
          </p>
          <Row>
            <Badge tone="danger">{orderStatus.cancelled}</Badge>
            <Badge tone="brand">{orderStatus.shipped}</Badge>
          </Row>
        </div>
      </Section>

      <Section title={t.sections.skeletonSpinner}>
        <Row>
          <Skeleton shape="circle" className="h-14 w-14" />
          <Skeleton shape="text" className="w-40" />
          <Skeleton shape="rect" className="w-56" />
          <Spinner size={24} label="در حال بارگذاری" />
        </Row>
      </Section>

      <Section title={t.sections.overlays}>
        <Row>
          <Button onClick={() => setModalOpen(true)}>{t.demo.openModal}</Button>
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            {t.demo.openDrawer}
          </Button>
          <Button variant="outline" onClick={() => setSheetOpen(true)}>
            {t.demo.openSheet}
          </Button>
        </Row>

        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title={t.demo.modalTitle}
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                {cta.viewOrder}
              </Button>
              <Button variant="destructive" onClick={() => setModalOpen(false)}>
                {t.demo.modalTitle}
              </Button>
            </>
          }
        >
          <p className="text-body text-secondary">{t.demo.modalBody}</p>
        </Modal>

        <Drawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={t.demo.drawerTitle}
        >
          <nav className="flex flex-col gap-1 p-3">
            <Button variant="ghost" className="justify-start">
              {cta.viewAllProducts}
            </Button>
            <Button variant="ghost" className="justify-start">
              {cta.trackOrder}
            </Button>
          </nav>
        </Drawer>

        <Sheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={t.demo.multiSelectLabel}
        >
          <div className="p-3">
            <p className="text-body text-secondary">
              {t.demo.multiSelectPlaceholder}
            </p>
          </div>
        </Sheet>
      </Section>

      <Section title={t.sections.toastEmpty}>
        <Row>
          <Button onClick={() => setToastOpen(true)}>
            {t.demo.triggerToast}
          </Button>
        </Row>
        <Toast open={toastOpen} onOpenChange={setToastOpen}>
          <span className="bg-accent/20 text-accent flex h-8 w-8 items-center justify-center rounded-full">
            <CheckIcon size={16} aria-hidden="true" />
          </span>
          {t.demo.toastMessage}
        </Toast>
        <Divider />
        <EmptyState
          icon={<Heart size={22} aria-hidden="true" />}
          title={t.demo.emptyStateTitle}
          description={t.demo.emptyStateDescription}
          action={<Button variant="outline">{t.demo.emptyStateAction}</Button>}
        />
      </Section>

      <Section title={t.sections.tabsTooltip}>
        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">{t.demo.tabOrders}</TabsTrigger>
            <TabsTrigger value="addresses">{t.demo.tabAddresses}</TabsTrigger>
            <TabsTrigger value="devices">{t.demo.tabDevices}</TabsTrigger>
          </TabsList>
          <TabsContent value="orders">
            <p className="text-body text-secondary">{t.demo.tabOrders}</p>
          </TabsContent>
          <TabsContent value="addresses">
            <p className="text-body text-secondary">{t.demo.tabAddresses}</p>
          </TabsContent>
          <TabsContent value="devices">
            <p className="text-body text-secondary">{t.demo.tabDevices}</p>
          </TabsContent>
        </Tabs>
        <Row>
          <Tooltip content={t.demo.tooltipContent}>
            <Button
              variant="ghost"
              icon={<Heart size={16} aria-hidden="true" />}
              aria-label={t.demo.tooltipContent}
            />
          </Tooltip>
        </Row>
      </Section>

      <Section title={t.sections.navigation}>
        <Pagination
          page={page}
          totalPages={5}
          onPageChange={setPage}
          previousLabel="صفحه‌ی قبلی"
          nextLabel="صفحه‌ی بعدی"
        />
      </Section>
    </div>
  );
}
