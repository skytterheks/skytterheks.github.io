/* MOTOR DE VENTANAS
   Los textos están en index.html y los colores en estilos.css.
   Este archivo controla abrir, cerrar, minimizar, arrastrar,
   la barra de tareas, las burbujas y preparar el correo.
   No necesita librerías externas, instalación ni compilación.
*/

(() => {
  const root = document.getElementById("skytterheks-room");
  const desktop = root.querySelector(".cy-desktop");
  const windowLayer = root.querySelector("#cy-window-layer");
  const taskList = root.querySelector("#cy-task-list");

  // El contenido se lee del HTML: no edites textos en este archivo.
  const panels = Object.fromEntries(
    [...document.querySelectorAll('template[id^="panel-"]')].map((t) => [
      t.id.slice(6),
      {
        title: t.dataset.title,
        task: t.dataset.task,
        status: t.dataset.status,
        html: t.innerHTML,
      },
    ]),
  );
  const datos = document.getElementById("datos-sitio").dataset;
  const email = datos.email;
  const domain = datos.domain;
  root.querySelector(".cy-address").textContent = "https://" + domain;
  document.querySelector('link[rel="canonical"]').href =
    "https://" + domain + "/";
  function updateContactLabels(box) {
    box.querySelectorAll("[data-email-link]").forEach((a) => {
      a.textContent = email;
      a.href = "mailto:" + email;
    });
    box
      .querySelectorAll("[data-domain-label]")
      .forEach((el) => (el.textContent = domain));
  }
  /* ==================== INTERACCIONES ====================
       Esta parte convierte el sitio en un escritorio con ventanas reales.
       No necesitas modificarla para cambiar textos, imágenes o colores. */

  const design = { initialWindow: "welcome", showFunctionNotes: false };
  const openWindows = new Map();
  let highestZ = 10;
  let cascadeIndex = 0;

  function updateIconStates() {
    root.querySelectorAll(".cy-icon[data-panel]").forEach((icon) => {
      icon.setAttribute(
        "aria-pressed",
        String(openWindows.has(icon.dataset.panel)),
      );
    });
  }

  function updateFunctionNotes(windowBox) {
    windowBox.querySelectorAll(".cy-function").forEach((note) => {
      note.hidden = !design.showFunctionNotes;
    });
  }

  function focusWindow(name) {
    const state = openWindows.get(name);
    if (!state) return;

    state.minimized = false;
    state.window.hidden = false;
    state.window.style.zIndex = String(++highestZ);

    openWindows.forEach((item) => {
      const isActive = item === state;
      item.window.classList.toggle("is-active", isActive);
      item.task.setAttribute("aria-pressed", String(isActive));
    });
  }

  function focusHighestVisibleWindow() {
    const visible = [...openWindows.entries()]
      .filter(([, state]) => !state.minimized)
      .sort(
        (a, b) =>
          Number(b[1].window.style.zIndex) - Number(a[1].window.style.zIndex),
      );

    if (visible.length) focusWindow(visible[0][0]);
  }

  function minimizeWindow(name) {
    const state = openWindows.get(name);
    if (!state) return;

    state.minimized = true;
    state.window.hidden = true;
    state.window.classList.remove("is-active");
    state.task.setAttribute("aria-pressed", "false");
    focusHighestVisibleWindow();
  }

  function closeWindow(name) {
    const state = openWindows.get(name);
    if (!state) return;

    state.window.remove();
    state.task.remove();
    openWindows.delete(name);
    updateIconStates();
    focusHighestVisibleWindow();
  }

  function toggleMaximize(name) {
    const state = openWindows.get(name);
    if (!state) return;

    state.window.classList.toggle("is-maximized");
    focusWindow(name);
  }

  function makeDraggable(windowBox, name) {
    const titlebar = windowBox.querySelector(".cy-titlebar");
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    titlebar.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".cy-window-control")) return;
      if (windowBox.classList.contains("is-maximized")) return;
      if (window.matchMedia("(max-width: 820px)").matches) return;
      if (event.button !== undefined && event.button !== 0) return;

      focusWindow(name);
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = windowBox.offsetLeft;
      startTop = windowBox.offsetTop;
      titlebar.setPointerCapture(pointerId);
    });

    titlebar.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== pointerId) return;

      const maxLeft = Math.max(
        8,
        desktop.clientWidth - windowBox.offsetWidth - 8,
      );
      const maxTop = Math.max(
        8,
        desktop.clientHeight - windowBox.offsetHeight - 65,
      );
      const nextLeft = Math.min(
        maxLeft,
        Math.max(8, startLeft + event.clientX - startX),
      );
      const nextTop = Math.min(
        maxTop,
        Math.max(8, startTop + event.clientY - startY),
      );

      windowBox.style.left = `${nextLeft}px`;
      windowBox.style.top = `${nextTop}px`;
    });

    const stopDragging = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      if (titlebar.hasPointerCapture(pointerId))
        titlebar.releasePointerCapture(pointerId);
      pointerId = null;
    };

    titlebar.addEventListener("pointerup", stopDragging);
    titlebar.addEventListener("pointercancel", stopDragging);
    titlebar.addEventListener("dblclick", (event) => {
      if (!event.target.closest(".cy-window-control")) toggleMaximize(name);
    });
  }

  function createWindow(name) {
    const panel = panels[name];
    if (!panel) return null;

    const windowBox = document.createElement("section");
    const offset = (cascadeIndex++ % 5) * 20;
    const left = Math.min(230 + offset, Math.max(8, desktop.clientWidth - 544));
    const top = 76 + offset;

    windowBox.className = "cy-window";
    windowBox.dataset.window = name;
    windowBox.tabIndex = -1;
    windowBox.setAttribute("aria-label", `Ventana ${panel.title}`);
    windowBox.style.left = `${left}px`;
    windowBox.style.top = `${top}px`;

    if (!window.matchMedia("(max-width: 820px)").matches) {
      const availableWidth = Math.max(520, desktop.clientWidth - left - 24);
      windowBox.style.width = `${Math.min(920, availableWidth)}px`;
    }

    windowBox.innerHTML = `
        <div class="cy-titlebar">
          <span aria-hidden="true">✿</span>
          <strong>${panel.title}</strong>
          <button class="cy-window-control" type="button" data-window-action="minimize" aria-label="Minimizar ventana">_</button>
          <button class="cy-window-control" type="button" data-window-action="maximize" aria-label="Maximizar o restaurar ventana">□</button>
          <button class="cy-window-control" type="button" data-window-action="close" aria-label="Cerrar ventana">×</button>
        </div>
        <div class="cy-menubar"><button data-panel="welcome">Inicio</button><button data-panel="portfolio">Portafolio</button><button data-panel="about">WBU</button><button data-panel="contact">Contacto</button></div>
        <div class="cy-content">${panel.html}</div>
        <div class="cy-status"><span>${panel.status}</span><span data-domain-label></span></div>`;

    const task = document.createElement("button");
    task.className = "cy-task";
    task.type = "button";
    task.dataset.windowTask = name;
    task.setAttribute("aria-pressed", "false");
    task.title = panel.title;
    task.textContent = panel.task || panel.title;

    windowLayer.append(windowBox);
    taskList.append(task);
    openWindows.set(name, { window: windowBox, task, minimized: false });
    makeDraggable(windowBox, name);
    updateFunctionNotes(windowBox);
    updateContactLabels(windowBox);
    updateIconStates();

    return windowBox;
  }

  function openPanel(name) {
    if (!panels[name]) return;
    if (!openWindows.has(name)) createWindow(name);
    focusWindow(name);
    openWindows.get(name).window.focus({ preventScroll: true });
  }

  root.addEventListener("pointerdown", (event) => {
    const windowBox = event.target.closest(".cy-window");
    if (windowBox) focusWindow(windowBox.dataset.window);
  });

  root.addEventListener("click", (event) => {
    const taskTrigger = event.target.closest("[data-window-task]");
    if (taskTrigger) {
      const name = taskTrigger.dataset.windowTask;
      const state = openWindows.get(name);
      if (!state) return;
      if (
        !state.minimized &&
        taskTrigger.getAttribute("aria-pressed") === "true"
      )
        minimizeWindow(name);
      else focusWindow(name);
      return;
    }

    const windowAction = event.target.closest("[data-window-action]");
    if (windowAction) {
      const windowBox = windowAction.closest(".cy-window");
      if (!windowBox) return;
      const name = windowBox.dataset.window;
      if (windowAction.dataset.windowAction === "minimize")
        minimizeWindow(name);
      if (windowAction.dataset.windowAction === "maximize")
        toggleMaximize(name);
      if (windowAction.dataset.windowAction === "close") closeWindow(name);
      return;
    }

    const panelTrigger = event.target.closest("[data-panel]");
    if (panelTrigger) openPanel(panelTrigger.dataset.panel);
  });

  function renderDesign() {
    openWindows.forEach((state) => updateFunctionNotes(state.window));
    if (!openWindows.size) openPanel(design.initialWindow);
  }

  // CONTACTO: prepara un correo; no requiere servidor ni plataforma.
  root.addEventListener("submit", (e) => {
    if (!e.target.matches("[data-contact-form]")) return;
    e.preventDefault();
    const d = new FormData(e.target);
    const body = `Nombre: ${d.get("nombre")}\nCorreo: ${d.get("correo")}\n\n${d.get("mensaje")}`;
    location.href =
      "mailto:" +
      email +
      "?subject=" +
      encodeURIComponent(d.get("motivo")) +
      "&body=" +
      encodeURIComponent(body);
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const active = [...openWindows.entries()].find(([, v]) =>
        v.window.classList.contains("is-active"),
      );
      if (active) {
        minimizeWindow(active[0]);
        active[1].task.focus();
      }
    }
  });
  const clock = () =>
    (root.querySelector(".cy-clock").textContent =
      new Date().toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      }));
  clock();
  setInterval(clock, 30000);
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let effects = !motion.matches,
    lastBubble = 0;
  const effectButton = document.getElementById("effects");
  function effectLabel() {
    effectButton.textContent = "Burbujas: " + (effects ? "sí" : "no");
    effectButton.setAttribute("aria-pressed", String(effects));
  }
  effectLabel();
  effectButton.onclick = () => {
    effects = !effects;
    effectLabel();
  };
  motion.addEventListener("change", () => {
    effects = !motion.matches;
    effectLabel();
  });
  document.addEventListener("pointermove", (e) => {
    if (
      !effects ||
      e.pointerType === "touch" ||
      performance.now() - lastBubble < 90
    )
      return;
    lastBubble = performance.now();
    const b = document.createElement("i");
    b.className = "sk-bubble";
    b.style.left = e.clientX + "px";
    b.style.top = e.clientY + "px";
    document.body.append(b);
    setTimeout(() => b.remove(), 1400);
  });
  window.addEventListener("resize", () => {
    if (innerWidth <= 820) return;
    openWindows.forEach(({ window: w }) => {
      w.style.width = Math.min(920, desktop.clientWidth - 250) + "px";
      w.style.left =
        Math.max(
          8,
          Math.min(w.offsetLeft, desktop.clientWidth - w.offsetWidth - 8),
        ) + "px";
      w.style.top =
        Math.max(
          8,
          Math.min(w.offsetTop, desktop.clientHeight - w.offsetHeight - 65),
        ) + "px";
    });
  });

  renderDesign();
})();
