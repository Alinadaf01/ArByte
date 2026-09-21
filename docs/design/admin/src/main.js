import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/700.css";
import "./style.css";
import { icons, tabIcons } from "./icons.js";
import { pages, pageMeta } from "./pages.js";

const ICON_SIZES = { xs: 16, sm: 18, md: 22, lg: 28, xl: 34 };
let currentPage = "dashboard";
let notifyCount = 3;

const NOTIFICATIONS = [
  {
    t: "تراکنش موفق",
    d: "سارا احمدی — ۲,۴۵۰,۰۰۰ تومان",
    time: "۲ دقیقه پیش",
    unread: true,
  },
  {
    t: "کاربر جدید",
    d: "رضا اکبری ثبت‌نام کرد",
    time: "۱۵ دقیقه پیش",
    unread: true,
  },
  {
    t: "هشدار سرور",
    d: "بار CPU به ۷۸٪ رسید",
    time: "۱ ساعت پیش",
    unread: true,
  },
  { t: "گزارش هفتگی", d: "آماده دانلود است", time: "دیروز", unread: false },
];

function renderIcon(name, size = "md") {
  const raw = icons[name];
  if (!raw) return "";
  const px = ICON_SIZES[size] ?? ICON_SIZES.md;
  const once = raw.match(/width="\d+" height="\d+"/);
  if (!once) return raw;
  return raw.replace(once[0], `width="${px}" height="${px}"`);
}

function getIconTargets(root) {
  const all = [...root.querySelectorAll("[data-icon]")];
  return all.filter(
    (el) => !all.some((other) => other !== el && other.contains(el)),
  );
}

let iconInjectLock = false;

function injectIcons(root) {
  if (!root || iconInjectLock) return;
  iconInjectLock = true;
  try {
    getIconTargets(root).forEach((el) => {
      const name = el.getAttribute("data-icon");
      const html = renderIcon(name, el.getAttribute("data-icon-size") || "md");
      if (name && html) el.innerHTML = html;
    });

    const slots = {
      "icon-menu": ["menu", "md"],
      "icon-close": ["close", "md"],
      "icon-bell": ["bell", "sm"],
      "icon-logo": ["logo", "md"],
      "icon-server": ["server", "md"],
    };
    Object.entries(slots).forEach(([id, [n, s]]) => {
      const el = document.getElementById(id);
      if (el && !el.hasAttribute("data-icon")) el.innerHTML = renderIcon(n, s);
    });

    root.querySelectorAll("[data-tab-icon]").forEach((btn) => {
      const tab = btn.getAttribute("data-tab");
      const iconEl = btn.querySelector(".tab-icon");
      if (iconEl && tabIcons[tab]) {
        iconEl.innerHTML = renderIcon(tabIcons[tab], "xs");
      }
    });
  } finally {
    iconInjectLock = false;
  }
}

function injectLayoutIcons() {
  const sidebar = document.getElementById("sidebar");
  const header = document.querySelector(".header-bar");
  const fab = document.getElementById("fab-new-tx");
  if (sidebar) injectIcons(sidebar);
  if (header) injectIcons(header);
  if (fab) injectIcons(fab);
}

const faNum = (s) =>
  s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

function animateCounters(root = document) {
  root.querySelectorAll("[data-count]").forEach((el) => {
    const target = el.getAttribute("data-count");
    const isPercent = target.includes("٪") || target.includes("%");
    const isM = /M/i.test(target);
    const raw = parseFloat(
      faNum(target)
        .replace(/[^\d.]/g, "")
        .replace(/,/g, ""),
    );
    if (Number.isNaN(raw)) return;
    const start = performance.now();
    const dur = 900;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - (1 - p) ** 3;
      const v = raw * ease;
      const toFa = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
      if (isM) el.textContent = `${toFa(v.toFixed(1))}M`;
      else if (isPercent) el.textContent = `${toFa(v.toFixed(1))}٪`;
      else el.textContent = Math.round(v).toLocaleString("fa-IR");
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
  });
}

function drawSparklines(root = document) {
  root.querySelectorAll(".spark-line").forEach((path) => {
    const len = path.getTotalLength?.() ?? 200;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    requestAnimationFrame(() => {
      path.style.transition = "stroke-dashoffset 1.2s ease-out";
      path.style.strokeDashoffset = "0";
    });
  });
}

function toast(msg, type = "info") {
  const stack = document.getElementById("toast-stack");
  const el = document.createElement("div");
  el.className = `toast toast--${type} anim-toast-in`;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add("anim-toast-out");
    setTimeout(() => el.remove(), 300);
  }, 2800);
}

function closeDropdowns(except) {
  document.querySelectorAll(".dropdown-panel, .search-panel").forEach((d) => {
    if (d !== except) d.classList.add("hidden");
  });
  document.querySelectorAll('[aria-expanded="true"]').forEach((b) => {
    if (!except || !b.closest(".dropdown-wrap")?.contains(except)) {
      if (
        b.id === "btn-notify" ||
        b.id === "btn-profile" ||
        b.id === "btn-search"
      ) {
        b.setAttribute("aria-expanded", "false");
      }
    }
  });
  document.getElementById("btn-search")?.classList.remove("btn-ghost--active");
}

function buildNotifyDropdown() {
  const panel = document.getElementById("dropdown-notify");
  panel.innerHTML = `
    <p class="dropdown-title">اعلان‌ها</p>
    ${NOTIFICATIONS.map(
      (n, i) => `
      <button type="button" class="notify-item anim-pop ${n.unread ? "notify-item--unread" : ""}" data-notify="${i}" style="animation-delay:${i * 0.05}s">
        <span class="font-semibold text-ink">${n.t}</span>
        <span class="mt-0.5 block text-[11px] text-ink-faint">${n.d}</span>
        <span class="mt-1 block text-[10px] text-ink-faint">${n.time}</span>
      </button>
    `,
    ).join("")}
    <button type="button" class="dropdown-action" id="clear-notify">علامت‌گذاری همه به‌عنوان خوانده‌شده</button>
  `;
  panel.querySelectorAll("[data-notify]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = NOTIFICATIONS[btn.getAttribute("data-notify")];
      n.unread = false;
      btn.classList.remove("notify-item--unread");
      notifyCount = Math.max(0, NOTIFICATIONS.filter((x) => x.unread).length);
      document.getElementById("notify-count").textContent = notifyCount || "";
      document
        .getElementById("notify-count")
        .classList.toggle("hidden", !notifyCount);
      toast(`مشاهده: ${n.t}`);
      closeDropdowns();
    });
  });
  panel.querySelector("#clear-notify")?.addEventListener("click", () => {
    NOTIFICATIONS.forEach((n) => {
      n.unread = false;
    });
    notifyCount = 0;
    document.getElementById("notify-count").classList.add("hidden");
    buildNotifyDropdown();
    toast("همه اعلان‌ها خوانده شد");
  });
}

function buildProfileDropdown() {
  const panel = document.getElementById("dropdown-profile");
  panel.innerHTML = `
    <button type="button" class="dropdown-item" data-goto="settings">پروفایل و تنظیمات</button>
    <button type="button" class="dropdown-item" data-goto="analytics">گزارش‌ها</button>
    <button type="button" class="dropdown-item" id="btn-logout">خروج از حساب</button>
  `;
  panel.querySelectorAll("[data-goto]").forEach((b) => {
    b.addEventListener("click", () => {
      navigateTo(b.getAttribute("data-goto"));
      closeDropdowns();
    });
  });
  panel.querySelector("#btn-logout")?.addEventListener("click", () => {
    toast("خروج انجام شد (نمایشی)");
    closeDropdowns();
  });
}

function setupHeader() {
  const searchInput = document.getElementById("search-input");
  const searchPanel = document.getElementById("search-panel");
  const btnSearch = document.getElementById("btn-search");
  const btnSearchClear = document.getElementById("btn-search-clear");
  const btnNewTx = document.getElementById("btn-new-tx");
  const btnNotify = document.getElementById("btn-notify");
  const btnProfile = document.getElementById("btn-profile");
  const notifyPanel = document.getElementById("dropdown-notify");
  const profilePanel = document.getElementById("dropdown-profile");

  buildNotifyDropdown();
  buildProfileDropdown();
  injectIcons(searchPanel);

  const syncSearchClear = () => {
    const has = Boolean(searchInput?.value.length);
    btnSearchClear?.classList.toggle("hidden", !has);
  };

  const closeSearch = () => {
    searchPanel?.classList.add("hidden");
    btnSearch?.setAttribute("aria-expanded", "false");
    btnSearch?.classList.remove("btn-ghost--active");
  };

  btnSearch?.addEventListener("click", (e) => {
    e.stopPropagation();
    const show = searchPanel.classList.contains("hidden");
    notifyPanel.classList.add("hidden");
    profilePanel.classList.add("hidden");
    btnNotify.setAttribute("aria-expanded", "false");
    btnProfile.setAttribute("aria-expanded", "false");
    btnNotify.classList.remove("btn-ghost--active");
    btnProfile.classList.remove("profile-btn--active");
    searchPanel.classList.toggle("hidden", !show);
    btnSearch.setAttribute("aria-expanded", String(show));
    btnSearch.classList.toggle("btn-ghost--active", show);
    if (show) {
      injectIcons(searchPanel);
      searchInput?.focus();
    }
  });

  searchInput?.addEventListener("input", () => {
    runGlobalSearch(searchInput.value.trim().toLowerCase());
    syncSearchClear();
  });

  btnSearchClear?.addEventListener("click", (e) => {
    e.stopPropagation();
    searchInput.value = "";
    runGlobalSearch("");
    syncSearchClear();
    searchInput?.focus();
  });

  searchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      runGlobalSearch("");
      syncSearchClear();
      closeSearch();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) closeDropdowns();
  });

  btnNewTx?.addEventListener("click", () => openModal());
  document
    .getElementById("fab-new-tx")
    ?.addEventListener("click", () => openModal());
  btnNotify?.addEventListener("click", (e) => {
    e.stopPropagation();
    const show = notifyPanel.classList.contains("hidden");
    notifyPanel.classList.toggle("hidden", !show);
    profilePanel.classList.add("hidden");
    searchPanel.classList.add("hidden");
    btnProfile.setAttribute("aria-expanded", "false");
    btnProfile.classList.remove("profile-btn--active");
    btnSearch.setAttribute("aria-expanded", "false");
    btnSearch.classList.remove("btn-ghost--active");
    btnNotify.setAttribute("aria-expanded", String(show));
    btnNotify.classList.toggle("btn-ghost--active", show);
  });

  btnProfile?.addEventListener("click", (e) => {
    e.stopPropagation();
    const show = profilePanel.classList.contains("hidden");
    profilePanel.classList.toggle("hidden", !show);
    notifyPanel.classList.add("hidden");
    searchPanel.classList.add("hidden");
    btnNotify.setAttribute("aria-expanded", "false");
    btnNotify.classList.remove("btn-ghost--active");
    btnSearch.setAttribute("aria-expanded", "false");
    btnSearch.classList.remove("btn-ghost--active");
    btnProfile.setAttribute("aria-expanded", String(show));
    btnProfile.classList.toggle("profile-btn--active", show);
  });

  document.addEventListener("click", closeDropdowns);

  document
    .querySelectorAll(
      ".dropdown-panel, .search-panel, .profile-btn, #btn-notify, #btn-search",
    )
    .forEach((el) => {
      el.addEventListener("click", (e) => e.stopPropagation());
    });
}

function openModal() {
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("modal-tx");
  backdrop?.classList.remove("hidden");
  modal?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    backdrop?.classList.add("modal-backdrop--show");
    modal?.classList.add("modal--show");
  });
  injectIcons(modal);
  modal?.querySelector('input[name="user"]')?.focus();
}

function closeModal() {
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("modal-tx");
  backdrop?.classList.remove("modal-backdrop--show");
  modal?.classList.remove("modal--show");
  setTimeout(() => {
    backdrop?.classList.add("hidden");
    modal?.classList.add("hidden");
    document.body.style.overflow = "";
  }, 280);
}

function setupModal() {
  document.getElementById("modal-close")?.addEventListener("click", closeModal);
  document.getElementById("modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document
    .getElementById("modal-tx")
    ?.addEventListener("click", (e) => e.stopPropagation());
  document.getElementById("form-tx")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const user = fd.get("user");
    toast(`تراکنش ${user} ثبت شد`);
    closeModal();
    e.target.reset();
    if (currentPage !== "transactions") navigateTo("transactions");
  });
}

function runGlobalSearch(q) {
  const root = document.getElementById("page-root");
  if (!q) {
    root
      .querySelectorAll("[data-searchable]")
      .forEach((el) => el.classList.remove("hidden", "opacity-40"));
    return;
  }
  root.querySelectorAll("[data-searchable]").forEach((el) => {
    const text = el.textContent.toLowerCase();
    const match = text.includes(q);
    el.classList.toggle("hidden", !match);
    el.classList.toggle(
      "opacity-40",
      !match && el.matches(".data-row, .user-card"),
    );
  });
}

function setupTableTabs() {
  const tabs = document.querySelectorAll('#tabs [role="tab"]');
  const rows = document.querySelectorAll("#rows tr");
  const empty = document.getElementById("empty");
  const table = document.getElementById("table");
  if (!tabs.length) return;
  const map = { success: "success", pending: "pending", failed: "failed" };
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("tab-on");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("tab-on");
      tab.setAttribute("aria-selected", "true");
      tab.classList.add("anim-tab-bump");
      setTimeout(() => tab.classList.remove("anim-tab-bump"), 300);
      const f = tab.getAttribute("data-tab");
      let n = 0;
      rows.forEach((r, i) => {
        const show = f === "all" || r.getAttribute("data-status") === map[f];
        r.classList.toggle("hidden", !show);
        if (show) {
          n++;
          r.style.animation = "none";
          r.offsetHeight;
          r.style.animation = `row-in 0.4s ease-out ${i * 0.05}s backwards`;
        }
      });
      if (empty && table) {
        empty.classList.toggle("hidden", n > 0);
        table.classList.toggle("hidden", n === 0);
      }
    });
  });
  document
    .getElementById("btn-download")
    ?.addEventListener("click", () =>
      toast("گزارش در حال آماده‌سازی...", "success"),
    );
}

function setupPageActions() {
  document
    .getElementById("btn-add-user")
    ?.addEventListener("click", () => toast("فرم کاربر جدید (نمایشی)"));
  document
    .getElementById("btn-save-settings")
    ?.addEventListener("click", () => toast("تنظیمات ذخیره شد", "success"));
  document.querySelectorAll(".theme-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll(".theme-chip")
        .forEach((c) => c.classList.remove("theme-chip-on"));
      chip.classList.add("theme-chip-on");
      toast(`تم ${chip.textContent} انتخاب شد`);
    });
  });
  document
    .querySelectorAll('[data-action="view-tx"], [data-action="view-user"]')
    .forEach((btn) => {
      btn.addEventListener("click", () => toast("جزئیات باز شد"));
    });
}

function initPage(page) {
  if (!pages[page]) return;
  currentPage = page;
  const root = document.getElementById("page-root");
  root.innerHTML = pages[page];
  applyPageMeta(page, root);
}

function applyPageMeta(page, root) {
  const meta = pageMeta[page];
  document.querySelector("[data-page-title]").textContent = meta.title;
  document.querySelector("[data-page-subtitle]").textContent = meta.subtitle;
  document.querySelectorAll("[data-nav]").forEach((n) => {
    const active = n.getAttribute("data-nav") === page;
    n.classList.toggle("nav-link-active", active);
    n.querySelector(".nav-pill")?.remove();
    if (active && !n.querySelector(".nav-pill")) {
      const p = document.createElement("span");
      p.className = "nav-pill";
      p.setAttribute("aria-hidden", "true");
      n.insertBefore(p, n.firstChild);
    }
  });
  injectIcons(root);
  setupTableTabs();
  setupPageActions();
  root
    .querySelectorAll(".data-row, .user-card, .metric")
    .forEach((el) => el.setAttribute("data-searchable", ""));
  if (page === "dashboard") {
    animateCounters(root);
    drawSparklines(root);
  }
  if (page === "analytics") drawSparklines(root);
}

function navigateTo(page) {
  if (!pages[page] || page === currentPage) return;
  const root = document.getElementById("page-root");
  root.classList.add("page-exit");
  setTimeout(() => {
    currentPage = page;
    root.innerHTML = pages[page];
    root.classList.remove("page-exit");
    root.classList.add("page-enter");
    applyPageMeta(page, root);
    setTimeout(() => root.classList.remove("page-enter"), 500);
    closeSidebar();
  }, 220);
}

function isSidebarDrawer() {
  return window.matchMedia("(max-width: 1023px)").matches;
}

function setDrawerOpen(open) {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.getElementById("menu-btn");
  const drawer = isSidebarDrawer() && open;
  sidebar?.classList.toggle("open", drawer);
  document.body.classList.toggle("drawer-open", drawer);
  document.body.classList.remove("sidebar-open");
  toggle?.setAttribute("aria-expanded", String(drawer));
}

function closeSidebar() {
  setDrawerOpen(false);
}

function openSidebar() {
  setDrawerOpen(true);
}

function setupSidebar() {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("close-btn");
  const mainColumn = document.querySelector(".main-column");
  const drawerMq = window.matchMedia("(max-width: 1023px)");

  closeSidebar();

  toggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    setDrawerOpen(!sidebar?.classList.contains("open"));
  });
  closeBtn?.addEventListener("click", closeSidebar);

  mainColumn?.addEventListener("click", () => {
    if (sidebar?.classList.contains("open")) closeSidebar();
  });

  const onDrawerMqChange = () => {
    if (!drawerMq.matches) closeSidebar();
  };
  drawerMq.addEventListener("change", onDrawerMqChange);
  window.addEventListener("resize", onDrawerMqChange);
  window.addEventListener("pageshow", closeSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !sidebar?.classList.contains("open")) return;
    const modal = document.getElementById("modal-backdrop");
    if (modal && !modal.classList.contains("hidden")) return;
    closeSidebar();
  });
}

function setupNavigation() {
  document.querySelectorAll("[data-nav]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(item.getAttribute("data-nav"));
    });
  });
}

document.body.classList.remove("sidebar-open", "drawer-open");
setupSidebar();
setupNavigation();
setupHeader();
setupModal();
injectLayoutIcons();
initPage("dashboard");
const pageRoot = document.getElementById("page-root");
pageRoot?.classList.add("page-enter");
setTimeout(() => pageRoot?.classList.remove("page-enter"), 500);
