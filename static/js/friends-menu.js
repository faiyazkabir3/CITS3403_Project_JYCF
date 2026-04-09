const friendsMenu = document.querySelector("[data-friends-menu]");
const friendsToggle = document.querySelector("[data-friends-toggle]");
const friendsDropdown = document.querySelector("[data-friends-dropdown]");

if (friendsMenu && friendsToggle && friendsDropdown) {
  let closeTimeoutId = null;

  const clearCloseTimer = () => {
    if (closeTimeoutId !== null) {
      window.clearTimeout(closeTimeoutId);
      closeTimeoutId = null;
    }
  };

  const setExpanded = (expanded) => {
    clearCloseTimer();
    friendsMenu.classList.toggle("is-open", expanded);
    friendsToggle.setAttribute("aria-expanded", String(expanded));
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimeoutId = window.setTimeout(() => {
      setExpanded(false);
    }, 180);
  };

  friendsToggle.addEventListener("click", () => {
    const isOpen = friendsMenu.classList.contains("is-open");
    setExpanded(!isOpen);
  });

  friendsMenu.addEventListener("mouseenter", () => {
    setExpanded(true);
  });

  friendsMenu.addEventListener("mouseleave", () => {
    scheduleClose();
  });

  friendsMenu.addEventListener("focusin", () => {
    setExpanded(true);
  });

  document.addEventListener("click", (event) => {
    if (!friendsMenu.contains(event.target)) {
      setExpanded(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setExpanded(false);
      friendsToggle.focus();
    }
  });
}
