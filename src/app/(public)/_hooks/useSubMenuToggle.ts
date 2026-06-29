"use client";

const useSubMenuToggle = () => {
  const toggleSubMenu = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const listItem = e.currentTarget.parentElement;
    if (!listItem) return;

    const subMenu = listItem.querySelector("ul.dropdown-menu") as HTMLUListElement | null;
    if (!subMenu) return;

    const isOpen = listItem.classList.contains("on");

    const siblings = listItem.parentElement?.querySelectorAll("li.dropdown.on");
    siblings?.forEach((sib) => {
      if (sib !== listItem) {
        sib.classList.remove("on");
        const sibMenu = sib.querySelector("ul.dropdown-menu") as HTMLUListElement | null;
        if (sibMenu) sibMenu.style.maxHeight = "0";
      }
    });

    if (isOpen) {
      listItem.classList.remove("on");
      subMenu.style.maxHeight = "0";
    } else {
      listItem.classList.add("on");
      subMenu.style.maxHeight = "20000px";
    }
  };

  return toggleSubMenu;
};

export default useSubMenuToggle;
