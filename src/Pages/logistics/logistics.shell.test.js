import fs from "fs";
import path from "path";

const root = path.join(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

describe("logistics web shell source contracts", () => {
  it("mounts logistics route groups in Routes.js", () => {
    const src = read("routes/Routes.js");
    expect(src).toContain("PrivateLogisticsHub");
    expect(src).toContain("PrivateLogisticsOwner");
    expect(src).toContain("PrivateLogisticsDriver");
    expect(src).toContain('path="/logistics"');
    expect(src).toContain('path="/logistics/owner"');
    expect(src).toContain('path="/logistics/driver"');
    expect(src).toContain("/logistics/invite");
    expect(src).toContain('path="/logistics/invite/:token"');
  });

  it("LogisticsActions call additive /logistics APIs only", () => {
    const src = read("Redux/Actions/LogisticsActions.jsx");
    expect(src).toContain("/logistics/session");
    expect(src).toContain("/logistics/auth/register");
    expect(src).toContain("/logistics/auth/login");
    expect(src).toContain("/logistics/auth/verifyOtp");
    expect(src).toContain("/logistics/job");
    expect(src).toContain("/logistics/hub/spotlight");
    expect(src).not.toContain("/service/auth");
    expect(src).not.toContain("post_tasks");
  });

  it("navs expose module toggle between logo and menus (not Logistics as a Tasker link)", () => {
    const customer = read("Components/Layout/CustomerAppNav.jsx");
    expect(customer).toContain("ModuleSwitcher");
    expect(customer).toContain("LOGISTICS_HUB_NAV");
    expect(customer).toContain("TASKER_NAV_LINKS");
    expect(customer).toContain('path: "/my-task"');
    expect(customer).toContain("logisticsHome");
    expect(customer).not.toMatch(/label:\s*"Logistics"/);

    const header = read("Components/Layout/Header.js");
    expect(header).toContain("logisticsOwnerOnTasker");
    expect(header).toContain("CustomerAppNav");
    expect(header).toContain("LogisticsAppNav");

    const privateRoute = read("routes/PrivateRoute.jsx");
    expect(privateRoute).toContain("Roles.LOGISTICS");
    expect(privateRoute).toContain('pathname === "/"');

    const protectHome = read("routes/ProtectHome.jsx");
    expect(protectHome).toContain("Roles.LOGISTICS");

    const sp = read("Components/Layout/ServiceProviderAppNav.jsx");
    expect(sp).toContain("ModuleSwitcher");
    expect(sp).toContain('taskerHome="/requests"');
    expect(sp).not.toMatch(/label:\s*"Logistics"/);

    const corp = read("Components/Layout/CorporateAppNav.jsx");
    expect(corp).toContain("ModuleSwitcher");
    expect(corp).toContain('taskerHome="/corporate"');
  });

  it("LogisticsAppNav uses appnav design and does not import deleted ModuleSwitcher.css", () => {
    const src = read("Components/Layout/LogisticsAppNav.jsx");
    expect(src).not.toContain("ModuleSwitcher.css");
    expect(src).toContain("appnav--logistics");
    expect(src).toContain("ModuleSwitcher");
    expect(src).toContain("app-tools");
    expect(src).toContain('taskerHome="/"');
    expect(src).toContain("isSharedModulePath");
    expect(src).toContain("getActiveModule");
    expect(src).toContain("appnav--logistics-supply");
    expect(src).toContain("LOGISTICS_HUB_NAV");
  });

  it("Layout mounts logistics supply sidebar for owner/operator chrome", () => {
    const layout = read("Components/Layout/Layout.js");
    expect(layout).toContain("LogisticsSupplySidebar");
    expect(layout).toContain("LogisticsSupplyChromeProvider");
    expect(layout).toContain("log-supply-shell");

    const switcher = read("Components/Layout/ModuleSwitcher.jsx");
    expect(switcher).toContain("LOGISTICS_OWNER_SIDEBAR");
    expect(switcher).toContain("LOGISTICS_OPERATOR_SIDEBAR");
    expect(switcher).toContain("My Vehicles");
    expect(switcher).toContain("Job Opportunities");
    expect(switcher).toContain('path: "/logistics/owner/equipment"');
    expect(switcher).toContain('label: "Equipment"');
    expect(switcher).toContain('path: "/logistics/owner/reports"');
    expect(switcher).toContain('label: "Reports"');
    // Operators exclude Vehicles + Operators menu
    const opStart = switcher.indexOf("LOGISTICS_OPERATOR_SIDEBAR");
    const opBlock = switcher.slice(opStart, opStart + 900);
    expect(opBlock).not.toContain("My Vehicles");
    expect(opBlock).not.toContain('label: "Operators"');
    expect(opBlock).not.toContain('label: "Availability"');
    expect(opBlock).not.toContain("/logistics/driver/availability");

    const driverHome = read("Pages/logistics/DriverHome.js");
    // v2.7.15: single Update status button reads GPS (Verify GPS removed)
    expect(driverHome).not.toContain("verifyGps");
    expect(driverHome).not.toContain("Verify GPS");
    expect(driverHome).toContain("readGpsPosition");
    expect(driverHome).toContain("log-dash-avail-block");
    expect(driverHome).not.toContain("/logistics/driver/availability");
    expect(driverHome).not.toContain("Extend +2 hours");
    expect(driverHome).not.toContain("Location label");
    expect(driverHome).not.toContain("extend_hours");
    expect(driverHome).not.toContain("remainingLabel");
  });


  it("Logistics hub/owner/driver guards keep Layout (app chrome)", () => {
    for (const file of [
      "routes/PrivateLogisticsHub.jsx",
      "routes/PrivateLogisticsOwner.jsx",
      "routes/PrivateLogisticsDriver.jsx",
    ]) {
      const src = read(file);
      expect(src).toContain('footerVariant="marketing"');
      expect(src).toContain("<Layout");
      expect(src).toContain("<Outlet");
    }
  });

  it("SignUp puts Equipment Owner first and uses logistics auth for role 4", () => {
    const src = read("Pages/SignUp.js");
    const optionsIdx = src.indexOf("ROLE_OPTIONS");
    const logisticsIdx = src.indexOf("Equipment Owner", optionsIdx);
    const customerIdx = src.indexOf("Need a Service", optionsIdx);
    expect(logisticsIdx).toBeGreaterThan(-1);
    expect(customerIdx).toBeGreaterThan(logisticsIdx);
    expect(src).toContain("Sign up as Equipment Owner");
    expect(src).toContain("brand-module");
    expect(src).toContain("LogisticsActions.register");
    expect(src).toContain("role-toggle--quad");
  });

  it("Post job / Search follow index2 customer flow (category tiles, web shell)", () => {
    const post = read("Pages/logistics/PostJob.js");
    expect(post).toContain("LogisticsCategoryTiles");
    expect(post).toContain("LogisticsPageShell");
    expect(post).toContain("Pick up from");
    expect(post).toContain("Return trip");
    expect(post).toContain("Return load photos");
    expect(post).toContain("return_images");
    expect(post).toContain("Post Job");
    expect(post).toContain("EquipmentPickerModal");
    expect(post).toContain("SubtypePickerModal");
    expect(post).toContain("weight_unit");
    expect(post).toContain('type="file"');
    expect(post).toContain("FormData");
    expect(post).toContain("LogisticsLocationField");
    expect(post).toContain("pickup_coords");
    expect(post).toContain("validateLogistic");
    expect(post).toContain("Price");
    expect(post).toContain("validatePlant");
    // Budget message comes from parseLogisticsMoney({ field: "Budget" })
    expect(post).toContain('field: "Budget"');
    expect(post).toContain("LogisticsMoneyInput");
    expect(post).toContain("log-plant-dates");
    expect(post).toContain("required");
    expect(post).toContain("plant_budget_unit");
    expect(post).toContain("budget_negotiable");
    expect(post).toContain("Price negotiable");
    expect(post).toContain("Budget negotiable");
    expect(post).toContain("negotiable: Boolean(form.budget_negotiable)");
    expect(post).toContain("quote field is locked");
    expect(post).toContain("targeted_asset_id");
    expect(post).toContain("categoryLocked");
    expect(post).toContain("locked={categoryLocked}");
    expect(post).toContain("Direct booking");
    expect(post).toContain('searchParams.get("asset")');
    const opJob = read("Pages/logistics/OperatorJob.js");
    expect(opJob).toContain("fixedBudget");
    expect(opJob).toContain("disabled={fixedBudget}");
    expect(post).toContain("log-pick-row");
    expect(post).toContain('value="hour"');
    expect(post).toContain('value="day"');
    expect(post).toContain("updateJob");
    expect(post).toContain("editId");

    const jobs = read("Pages/logistics/MyJobs.js");
    expect(jobs).toContain("canEditOrRemove");
    expect(jobs).toContain("deleteJob");
    expect(jobs).toContain("/logistics/post?edit=");
    expect(jobs).toContain("log-job-gallery");
    expect(jobs).toContain("job.images");
    expect(jobs).toContain("jobImageUrl");
    expect(jobs).toContain("STATUS_LABEL");
    expect(jobs).toContain("LogisticsJobRoutePanel");
    expect(jobs).toContain("log-job-hero");
    expect(jobs).toContain("log-jobs-toolbar");
    expect(jobs).toContain("log-jobs-pager");
    expect(jobs).toContain("pageSize");
    expect(jobs).toContain("applied.from");
    expect(jobs).toContain("listMyJobs");

    const routePanel = read("CommanComponents/LogisticsJobRoutePanel.jsx");
    expect(routePanel).toContain("DirectionsService");
    expect(routePanel).toContain("Pickup");
    expect(routePanel).toContain("Drop-off");
    expect(routePanel).toContain("loadGooglePlaces");

    const hub = read("Pages/logistics/HubHome.js");
    expect(hub).toContain("getHubSpotlight");
    expect(hub).toContain("featured_logistics");
    expect(hub).toContain("top_rated_logistics");
    expect(hub).toContain("top_rated_equipment");
    expect(hub).toContain("Book");
    expect(hub).toContain("log-hub-home");
    expect(hub).toContain("Current location");
    expect(hub).toContain("What do you need?");

    const loc = read("CommanComponents/LogisticsLocationField.jsx");
    expect(loc).toContain("BookingLocationPickerModal");
    expect(loc).toContain("onConfirm");
    expect(loc).toContain("setOpen(false)");

    const locModal = read("CommanComponents/Modals/BookingLocationPickerModal.jsx");
    expect(locModal).toContain("animation={false}");
    expect(locModal).toContain("restoreBodyScrollIfIdle");
    expect(locModal).toContain("onExited");
    expect(locModal).toContain("replaceChildren");
    expect(locModal).not.toContain("querySelectorAll(\".modal-backdrop\")");
    expect(locModal).not.toContain("el.remove()");

    const search = read("Pages/logistics/Search.js");
    expect(search).toContain("LogisticsCategoryTiles");
    expect(search).toContain("Search trucks");
    expect(search).toContain("Search equipment");
    expect(search).toContain("Book a Logistic/Equipment");
    expect(search).toContain("EquipmentPickerModal");
    expect(search).toContain("LogisticsLocationField");
    expect(search).toContain("radius_km");
    expect(search).toContain("company_lat");
    expect(search).toContain("company_long");
    expect(search).toContain("log-search-layout");
    expect(search).toContain("log-search-sidebar");
    expect(search).toContain("log-jobs-table");
    expect(search).toContain("Owner / business");
    expect(search).toContain("compact");
    expect(search).toContain('option value="">None</option>');
    expect(search).toContain("onCategoryChange");
    expect(search).toContain("PAGE_SIZE");
    expect(search).toContain("log-jobs-pager");
    expect(search).toContain("showPagination");
    expect(search).toContain("hub_category");
    expect(search).toContain("log-search-asset__thumb");
    expect(search).toContain("current_location");
    expect(search).toContain("Current location");
    expect(search).toContain("placeShortLabel");
    expect(search).toContain("log-search-location");
    expect(search).not.toContain("Direct book");
    expect(search).not.toContain("Min weight");
    expect(search).not.toContain("Hire from");
    expect(search).not.toContain("Hire to");
    expect(search).not.toContain("min_weight");
    expect(search).not.toContain("hire_from");
    expect(search).not.toContain("min_capacity");
    expect(search).not.toContain("log-result-list");

    const fleet = read("Pages/logistics/Fleet.js");
    expect(fleet).toContain("LogisticsCategoryTiles");
    expect(fleet).toContain("Add equipment");
    expect(fleet).toContain("EquipmentPickerModal");
    expect(fleet).toContain("SubtypePickerModal");
    expect(fleet).toContain("Identity");
    expect(fleet).toContain("Carriage area");
    expect(fleet).toContain("Save equipment");
    expect(fleet).toContain("No equipment yet");
    expect(fleet).toContain("FLEET_PAGE_SIZE");
    expect(fleet).toContain("matchesFleetFilters");
    expect(fleet).toContain('value="vehicle"');
    expect(fleet).toContain('value="equipment"');
    expect(fleet).toContain("log-jobs-toolbar");
    expect(fleet).toContain("showPagination");
    expect(fleet).toContain("/logistics/owner/fleet/");
    expect(fleet).toContain("Disabled");
    expect(fleet).toContain("checkAssetIdentity");
    expect(fleet).toContain("carriage_length_ft");
    expect(fleet).toContain("normalizePlateInput");
    expect(fleet).toContain("log-field--error");
    expect(fleet).not.toContain("Unique check");

    const ownerAsset = read("Pages/logistics/OwnerAsset.js");
    expect(ownerAsset).toContain("patchAsset");
    expect(ownerAsset).toContain("Disable");
    expect(ownerAsset).toContain("Enable");
    expect(ownerAsset).toContain("Edit details");
    expect(ownerAsset).toContain("is_active");
    expect(ownerAsset).toContain("assignOperator");
    expect(ownerAsset).toContain("unassignOperator");
    expect(ownerAsset).toContain("Photos");
    expect(ownerAsset).toContain("Documents");
    expect(ownerAsset).toContain("Operators");
    expect(ownerAsset).toContain("Add operator");
    expect(ownerAsset).toContain("Remove");

    const routes = read("routes/Routes.js");
    expect(routes).toContain('path="fleet/:id"');
    expect(routes).toContain("LogisticsOwnerAsset");
    expect(routes).toContain("LogisticsOperators");
    expect(routes).toContain('path="operators"');

    const operators = read("Pages/logistics/Operators.js");
    expect(operators).toContain("Add Operator");
    expect(operators).toContain("Send invite");
    expect(operators).toContain("plant_licence_number");
    expect(operators).toContain("createSubUser");
    expect(operators).toContain("Assign to equipment");
    expect(operators).toContain("(optional)");
    expect(operators).toContain("Copy link");
    expect(operators).toContain("invite?token=");
    expect(operators).not.toContain("Plant competency ticket");
    expect(operators).not.toContain("Many-to-many");

    const moduleSwitcher = read("Components/Layout/ModuleSwitcher.jsx");
    expect(moduleSwitcher).toContain('label: "Operators"');
    expect(moduleSwitcher).toContain("/logistics/owner/operators");
    expect(moduleSwitcher).not.toContain('label: "Drivers"');

    const shell = read("CommanComponents/LogisticsPageShell.jsx");
    expect(shell).not.toContain("import Layout");
    expect(shell).toContain("SimbaPageBanner");
    expect(shell).toContain("isSupplyShell");
    expect(shell).toContain("p-logistics-supply");
    expect(shell).toContain("!supply");

    const nav = read("Components/Layout/CustomerAppNav.jsx");
    expect(nav).toContain("useProductModule");
  });

  it("owner/supply pages hide the title banner via LogisticsPageShell", () => {
    const shell = read("CommanComponents/LogisticsPageShell.jsx");
    expect(shell).toContain('mid === "Owner"');
    expect(shell).toContain('mid === "Operator"');
    expect(shell).toContain('home.includes("/logistics/owner")');
    expect(shell).toContain("{!supply ? (");

    const ownerPages = [
      "Pages/logistics/OwnerDashboard.js",
      "Pages/logistics/Fleet.js",
      "Pages/logistics/OwnerEquipment.js",
      "Pages/logistics/OwnerEarnings.js",
      "Pages/logistics/OwnerAnalytics.js",
      "Pages/logistics/Operators.js",
      "Pages/logistics/OwnerAvailability.js",
      "Pages/logistics/OwnerAsset.js",
    ];
    for (const file of ownerPages) {
      const src = read(file);
      expect(src).toContain("LogisticsPageShell");
      expect(src).toContain('homeTo="/logistics/owner"');
    }
    const avail = read("Pages/logistics/OwnerAvailability.js");
    expect(avail).toContain("LogisticsLocationField");
    expect(avail).toContain("Save location");
    expect(avail).toContain("lat:");
    expect(avail).toContain("log-jobs-table");
    expect(avail).toContain("Vehicle, plate, operator");
  });

  it("operator earnings supports date range and job search", () => {
    const driver = read("Pages/logistics/DriverHome.js");
    expect(driver).toContain("function OperatorEarnings");
    expect(driver).toContain("Job number, route");
    expect(driver).toContain("LogisticsDateInput");
    expect(driver).toContain("params.from");
    expect(driver).toContain("params.to");
    expect(driver).toContain("params.q");
    expect(driver).toContain("job_number");
  });

  it("owner list pages share log-jobs-table chrome", () => {
    const listPages = [
      "Pages/logistics/QuotesList.js",
      "Pages/logistics/OwnerEarnings.js",
      "Pages/logistics/Fleet.js",
      "Pages/logistics/OwnerEquipment.js",
      "Pages/logistics/OwnerAvailability.js",
      "Pages/logistics/SupplyPages.js",
      "Pages/logistics/OwnerAnalytics.js",
      "Pages/logistics/Operators.js",
    ];
    for (const file of listPages) {
      const src = read(file);
      expect(src).toContain("log-jobs-table");
      expect(src).toContain("log-jobs-table-wrap");
      expect(src).toContain("log-jobs-toolbar");
    }

    const myJobs = read("Pages/logistics/SupplyPages.js");
    expect(myJobs).toContain("listAssignedJobs");
    expect(myJobs).toContain("params.q");
    expect(myJobs).toContain("params.status");
    expect(myJobs).toContain("Updated from");

    const operators = read("Pages/logistics/Operators.js");
    expect(operators).toContain("filteredOperators");
    expect(operators).toContain("Assignment");
    expect(operators).toContain("Search operators");

    const css = read("Pages/logistics/logistics.css");
    expect(css).toContain(".log-jobs-table-wrap");
    expect(css).toContain("border-radius: 14px");
    expect(css).toContain(".p-logistics-supply");
    expect(css).toContain(".log-jobs-toolbar--wrap");

    const earnings = read("Pages/logistics/OwnerEarnings.js");
    expect(earnings).toContain("log-jobs-toolbar--wrap");
  });
});
