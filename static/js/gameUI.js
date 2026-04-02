// gameUI.js
import { createCombatEngine } from "./combat-engine.js";

function $(sel) {
  return document.querySelector(sel);
}

function render(engine, events = []) {
  // Temporary: put latest event text into the graphics placeholder.
  const p = $(".graphics-area p");
  if (p && events.length) p.textContent = events[events.length - 1];

  // Optional: update stats list if you want (simple overwrite for now)
  const statsUl = $(".player-stat-box ul");
  if (statsUl) {
    const s = engine.state;
    statsUl.innerHTML = `
      <li>HP: ${s.inventory.health}</li>
      <li>MED: ${s.inventory.medKits}</li>
      <li>GREN: ${s.inventory.grenades}</li>
      <li>PISTOL: ${s.pistol.ammoInGun}/${s.pistol.magCapacity} (BAG ${s.pistol.ammoInBag})</li>
      <li>SHIELD: ${s.shield.equipped ? "ON" : "OFF"}</li>
    `;
  }
}

export function bootGameUI({ difficultyText = "EASY" } = {}) {
  const engine = createCombatEngine({ difficulty: difficultyText });

  // Start combat immediately for now (you can move this behind an "Encounter" button later).
  render(engine, engine.startCombat());

  // Map your three existing buttons to starter actions.
  // ATTACK -> pistol
  // DEFEND -> dodge
  // INVENTORY -> toggle shield (placeholder until you build a real inventory modal)
  const buttons = document.querySelectorAll(".todo-buttons .action-btn");
  buttons.forEach((btn) => {
    const label = btn.textContent.trim().toUpperCase();

    btn.addEventListener("click", () => {
      let events = [];

      if (label === "ATTACK") events = engine.dispatch("pistol");
      else if (label === "DEFEND") events = engine.dispatch("dodge");
      else if (label === "INVENTORY") events = engine.dispatch("toggleShield");
      else events = [`No handler for ${label} yet.`];

      render(engine, events);
    });
  });

  return engine;
}
