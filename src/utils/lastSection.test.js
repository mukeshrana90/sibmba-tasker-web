describe("last section (item 51)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.resetModules();
    window.history.pushState({}, "", "/");
  });

  const load = () => require("./lastSection");

  test("a new visitor gets the balanced home", () => {
    expect(load().lastSectionRedirect()).toBeNull();
  });

  test("a returning visitor lands on the section they chose", () => {
    localStorage.setItem("lastSection", "logistics");
    expect(load().lastSectionRedirect()).toBe("/logistics");
    jest.resetModules();
    sessionStorage.clear();
    localStorage.setItem("lastSection", "services");
    expect(load().lastSectionRedirect()).toBe("/services");
  });

  test("only the first page of a tab redirects, so the logo still reaches home", () => {
    localStorage.setItem("lastSection", "logistics");
    const first = load();
    expect(first.lastSectionRedirect()).toBe("/logistics");
    first.consumeLastSectionRedirect();
    expect(first.lastSectionRedirect()).toBeNull();
    jest.resetModules();
    expect(load().lastSectionRedirect()).toBeNull();
  });

  test("the switcher's tasker choice is saved as services", () => {
    const { setLastSection, getLastSection } = load();
    setLastSection("tasker");
    expect(getLastSection()).toBe("services");
  });
});
