/* Meine Vorratskammer – Supabase-Anbindung */
(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const config = window.APP_CONFIG || {};

  if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_KEY) {
    showFatal("Die Supabase-Einstellungen fehlen. Bitte prüfe config.js und die Script-Reihenfolge in index.html.");
    return;
  }

  const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
  let user = null;
  let household = null;
  let foods = [];
  let shopping = [];
  let installPrompt = null;
const VAPID_PUBLIC_KEY = "BG4pjNv4rx6BnRYzUAEvhfgNF4qwMJ6EPxQT4Pt_UeCfNcX_GTCMD45-bPnb6SPo8W5b5deVMMYVIEWsCOobTDI";
  function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

async function enablePushNotifications() {
  if (!user) {
    throw new Error("Bitte melde dich zuerst an.");
  }

  if (!("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)) {
    throw new Error("Push-Benachrichtigungen werden hier nicht unterstützt.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Du hast Benachrichtigungen nicht erlaubt.");
  }

  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }

  const subscriptionData = subscription.toJSON();

  const { error } = await db
    .from("push_subscriptions")
    .upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscriptionData.keys.p256dh,
      auth_key: subscriptionData.keys.auth
    }, {
      onConflict: "endpoint"
    });

  if (error) {
    throw error;
  }

  showNotice("Push-Benachrichtigungen wurden aktiviert.");
}
  const categoryIcons = {
    "Obst & Gemüse": "🥑",
    "Milchprodukte": "🥛",
    "Getreide & Brot": "🥖",
    "Konserven": "🥫",
    "Getränke": "🧃",
    "Tiefkühl": "🧊",
    "Sonstiges": "🍽️"
  };

  function showFatal(message) {
    const main = $("main") || document.body;
    const box = document.createElement("div");
    box.className = "notice";
    box.style.cssText = "display:block;max-width:900px;margin:20px auto;";
    box.textContent = message;
    main.prepend(box);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function showNotice(message, isError = false) {
    const el = $("#notice");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
    el.style.background = isError ? "#fbe5e1" : "#edf1e8";
    el.style.color = isError ? "#a4493c" : "#4f694b";
  }

  function clearNotice() {
    const el = $("#notice");
    if (el) el.classList.add("hidden");
  }

  function addAccountInterface() {
    const main = $("main");
    const hero = $(".hero");
    const auth = document.createElement("section");
    auth.id = "accountPanel";
    auth.style.cssText = "max-width:1064px;margin:18px auto;padding:18px;background:#fff;border:1px solid #e9e9e2;border-radius:16px;";
    auth.innerHTML = `
      <div id="authSignedOut">
        <h2 style="margin:0 0 8px;font-size:21px;">Anmelden oder Konto erstellen</h2>
        <p style="margin:0 0 14px;color:#70796e;font-size:13px;line-height:1.5;">Jede Person nutzt ihre eigene E-Mail-Adresse und ihr eigenes Passwort.</p>
        <form id="authForm" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;align-items:end;">
          <label>E-Mail-Adresse<input id="authEmail" type="email" autocomplete="email" required placeholder="name@beispiel.de"></label>
          <label>Passwort<input id="authPassword" type="password" autocomplete="current-password" minlength="6" required placeholder="Mindestens 6 Zeichen"></label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="button primary" type="submit" id="signInButton">Anmelden</button>
            <button class="button quiet" type="button" id="signUpButton">Konto erstellen</button>
          </div>
        </form>
        <p id="authMessage" role="status" style="font-size:12px;color:#70796e;margin:10px 0 0;"></p>
      </div>
      <div id="authSignedIn" class="hidden">
        <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
          <div><strong id="signedInEmail"></strong><p style="font-size:12px;color:#70796e;margin:4px 0 0;">Angemeldet</p></div>
         <button class="button primary" id="enablePushButton" type="button">Erinnerungen aktivieren</button>
          <button class="button quiet" id="signOutButton" type="button">Abmelden</button>
        </div>
      </div>`;
    if (hero) main.insertBefore(auth, hero);
    else main.prepend(auth);

    const householdCard = $(".household-card");
    if (householdCard) {
      householdCard.innerHTML = `
        <div class="household-icon">⌂</div>
        <div style="flex:1;min-width:0;">
          <strong>Gemeinsamer Haushalt</strong>
          <div id="householdSignedOut" style="font-size:12px;color:#798076;margin-top:5px;">Bitte melde dich an, um einen Haushalt zu erstellen oder einem beizutreten.</div>
          <div id="householdSetup" class="hidden" style="margin-top:12px;">
            <form id="createHouseholdForm" style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px;">
              <input id="householdName" required maxlength="80" placeholder="Name, z. B. Zuhause" style="flex:1;min-width:170px;border:1px solid #e1e3da;border-radius:10px;padding:11px;font:inherit;">
              <button class="button primary" type="submit">Haushalt erstellen</button>
            </form>
            <form id="joinHouseholdForm" style="display:flex;gap:8px;flex-wrap:wrap;margin:0;">
              <input id="inviteCode" required maxlength="40" placeholder="Einladungscode" style="flex:1;min-width:170px;border:1px solid #e1e3da;border-radius:10px;padding:11px;font:inherit;">
              <button class="button quiet" type="submit">Beitreten</button>
            </form>
            <p id="householdMessage" role="status" style="font-size:12px;color:#70796e;margin:9px 0 0;"></p>
          </div>
          <div id="householdActive" class="hidden" style="margin-top:8px;">
            <p id="householdNameDisplay" style="font-size:13px;margin:4px 0;"></p>
            <p style="font-size:12px;color:#798076;margin:4px 0;">Einladungscode: <strong id="inviteCodeDisplay" style="letter-spacing:1px;"></strong></p>
            <p style="font-size:11px;color:#798076;margin:4px 0 0;">Teile diesen Code nur mit Personen, die deinem Haushalt beitreten sollen.</p>
          </div>
        </div>`;
    }
  }

  function setAuthView(signedIn) {
    $("#authSignedOut")?.classList.toggle("hidden", signedIn);
    $("#authSignedIn")?.classList.toggle("hidden", !signedIn);
    $("#householdSignedOut")?.classList.toggle("hidden", signedIn);
    $("#householdSetup")?.classList.toggle("hidden", !signedIn);
    if (signedIn && user) $("#signedInEmail").textContent = user.email || "Angemeldet";
  }

  function setHouseholdView(active) {
    $("#householdSetup")?.classList.toggle("hidden", !user || active);
    $("#householdActive")?.classList.toggle("hidden", !active);
    if (active) {
      $("#householdNameDisplay").textContent = `Aktiver Haushalt: ${household.name}`;
      $("#inviteCodeDisplay").textContent = household.invite_code || "Kein Code verfügbar";
      $("#householdName").value = "";
      $("#inviteCode").value = "";
    }
  }
  function daysLeft(date) {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(`${date}T00:00:00`);
    if (Number.isNaN(expiry.getTime())) return null;
    return Math.round((expiry - today) / 86400000);
  }

  function expiryStatus(date) {
    const days = daysLeft(date);
    if (days === null) return { text: "Ohne Datum", cls: "" };
    if (days < 0) return { text: `Seit ${Math.abs(days)} Tagen abgelaufen`, cls: "expired" };
    if (days === 0) return { text: "Heute fällig", cls: "soon" };
    if (days <= 7) return { text: `Noch ${days} Tage`, cls: "soon" };
    return { text: `Noch ${days} Tage`, cls: "" };
  }

  function renderFoods() {
    const list = $("#items");
    if (!list) return;
    const search = ($("#search")?.value || "").trim().toLowerCase();
    const filter = $("#filter")?.value || "all";
    const visible = foods.filter((item) => {
      const status = expiryStatus(item.expires_on);
      const matchesSearch = item.name.toLowerCase().includes(search);
      const matchesFilter = filter === "all" ||
        (filter === "soon" && status.cls === "soon") ||
        (filter === "expired" && status.cls === "expired");
      return matchesSearch && matchesFilter;
    });

    list.innerHTML = visible.map((item) => {
      const status = expiryStatus(item.expires_on);
      const icon = categoryIcons[item.category] || "🍽️";
      const quantity = item.quantity ?? 1;
      const unit = item.unit || "Stück";
      const dateText = item.expires_on
        ? `MHD: ${new Date(`${item.expires_on}T00:00:00`).toLocaleDateString("de-DE")}`
        : "Kein Mindesthaltbarkeitsdatum";
      return `<article class="item">
        <div class="food-icon">${icon}</div>
        <div class="item-main"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(quantity)} ${escapeHtml(unit)} · ${escapeHtml(item.category || "Sonstiges")} · ${escapeHtml(dateText)}</small></div>
        <span class="expiry-tag ${status.cls}">${escapeHtml(status.text)}</span>
        <button class="delete" type="button" data-delete-food="${escapeHtml(item.id)}" aria-label="Lebensmittel löschen">×</button>
      </article>`;
    }).join("");

    $("#empty")?.classList.toggle("hidden", visible.length > 0);
    list.classList.toggle("hidden", visible.length === 0);
    $("#totalCount").textContent = foods.length;
    $("#soonCount").textContent = foods.filter((x) => expiryStatus(x.expires_on).cls === "soon").length;
    $("#expiredCount").textContent = foods.filter((x) => expiryStatus(x.expires_on).cls === "expired").length;
  }

  function renderShopping() {
    const list = $("#shoppingItems");
    if (!list) return;
    const open = shopping.filter((x) => !x.is_checked);
    $("#shoppingCount").textContent = open.length;
    list.innerHTML = shopping.map((item) => `
      <article class="item">
        <input type="checkbox" data-check-shopping="${escapeHtml(item.id)}" ${item.is_checked ? "checked" : ""} aria-label="Erledigt">
        <div class="item-main"><strong style="${item.is_checked ? "text-decoration:line-through;color:#92978f;" : ""}">${escapeHtml(item.name)}</strong></div>
        <button class="delete" type="button" data-delete-shopping="${escapeHtml(item.id)}" aria-label="Eintrag löschen">×</button>
      </article>`).join("");
    $("#shoppingEmpty")?.classList.toggle("hidden", shopping.length > 0);
  }

  function renderRecipes() {
    const target = $("#recipeItems");
    if (!target) return;
    const soon = foods.filter((x) => {
      const d = daysLeft(x.expires_on);
      return d !== null && d >= 0 && d <= 7;
    });
    const ingredients = soon.length ? soon : foods;
    const ideas = [
      { emoji: "🥗", title: "Bunte Resteküche", text: "Schneide Gemüse und andere frische Zutaten klein und kombiniere sie zu einem Salat oder einer Gemüsepfanne." },
      { emoji: "🍲", title: "Herzhafte Vorratssuppe", text: "Koche passende Gemüse- und Konservenvorräte mit Brühe zu einer einfachen Suppe." },
      { emoji: "🍝", title: "Schnelle Nudelpfanne", text: "Verwerte passende Zutaten mit Nudeln, etwas Öl und Gewürzen zu einer schnellen Mahlzeit." },
      { emoji: "🥪", title: "Brotzeit", text: "Nutze Brot, Milchprodukte und Gemüse für belegte Brote oder Sandwiches." }
    ];
    const names = ingredients.slice(0, 4).map((x) => x.name);
    target.innerHTML = ideas.map((idea) => `<article class="recipe"><span class="emoji">${idea.emoji}</span><h3>${idea.title}</h3><p>${escapeHtml(idea.text)}${names.length ? ` Mögliche Zutaten aus deinem Bestand: ${escapeHtml(names.join(", "))}.` : ""}</p></article>`).join("");
  }

  function renderAll() {
    renderFoods();
    renderShopping();
    renderRecipes();
  }

  async function loadHouseholds() {
    const { data: memberships, error } = await db
      .from("household_members")
      .select("household_id, role, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) throw error;

    if (!memberships?.length) {
      household = null;
      setHouseholdView(false);
      foods = [];
      shopping = [];
      renderAll();
      return;
    }

    const ids = memberships.map((m) => m.household_id);
    const { data: homes, error: homeError } = await db
      .from("households")
      .select("id, name, invite_code")
      .in("id", ids);
    if (homeError) throw homeError;

    household = homes?.[0] || null;
    if (!household) {
      setHouseholdView(false);
      return;
    }
    setHouseholdView(true);
    await loadSharedData();
  }

  async function loadSharedData() {
    if (!household) return;
    const [foodResult, shoppingResult] = await Promise.all([
      db.from("pantry_items").select("*").eq("household_id", household.id).order("created_at", { ascending: false }),
      db.from("shopping_items").select("*").eq("household_id", household.id).order("created_at", { ascending: false })
    ]);
    if (foodResult.error) throw foodResult.error;
    if (shoppingResult.error) throw shoppingResult.error;
    foods = foodResult.data || [];
    shopping = shoppingResult.data || [];
    renderAll();
  }
  async function signIn(email, password) {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email, password) {
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.session) {
      $("#authMessage").textContent = "Konto angelegt. Bitte bestätige zuerst deine E-Mail-Adresse über die Nachricht von Supabase und melde dich danach an.";
    } else {
      $("#authMessage").textContent = "Konto angelegt und angemeldet.";
    }
  }

  async function handleAuthSession(session) {
    user = session?.user || null;
    setAuthView(Boolean(user));
    clearNotice();

    if (!user) {
      household = null;
      foods = [];
      shopping = [];
      setHouseholdView(false);
      renderAll();
      return;
    }

    try {
      await loadHouseholds();
      if (!household) {
        showNotice("Du bist angemeldet. Erstelle unten einen Haushalt oder tritt mit einem Einladungscode bei.");
      }
    } catch (error) {
      showNotice(`Daten konnten nicht geladen werden: ${error.message}`, true);
    }
  }

  async function createHousehold(name) {
    const { error } = await db.rpc("create_household", { p_name: name });
    if (error) throw error;
    await loadHouseholds();
    if (!household) {
      throw new Error("Der Haushalt wurde angelegt, konnte aber nicht geladen werden. Bitte Seite neu laden.");
    }
    $("#householdMessage").textContent = `Haushalt erstellt. Einladungscode: ${household.invite_code || "nicht verfügbar"}`;
    showNotice("Haushalt erstellt. Du kannst den Einladungscode mit anderen teilen.");
  }

  async function joinHousehold(code) {
    const { error } = await db.rpc("join_household", { p_invite_code: code });
    if (error) throw error;
    await loadHouseholds();
    if (!household) {
      throw new Error("Beitritt wurde ausgeführt, aber der Haushalt konnte nicht geladen werden. Bitte Seite neu laden.");
    }
    $("#householdMessage").textContent = `Du bist dem Haushalt „${household.name}“ beigetreten.`;
    showNotice("Haushalt erfolgreich beigetreten.");
  }

  function bindEvents() {
    const pushButton = $("#enablePushButton");

pushButton?.addEventListener("click", async () => {
  pushButton.disabled = true;
  pushButton.textContent = "Wird aktiviert …";

  try {
    await enablePushNotifications();
    pushButton.textContent = "Erinnerungen aktiviert";
  } catch (error) {
    showNotice(`Aktivierung fehlgeschlagen: ${error.message}`, true);
    pushButton.textContent = "Erinnerungen aktivieren";
  } finally {
    pushButton.disabled = false;
  }
});
    $("#authForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = $("#authEmail").value.trim();
      const password = $("#authPassword").value;
      $("#authMessage").textContent = "Anmeldung läuft …";
      try {
        await signIn(email, password);
        $("#authMessage").textContent = "Du bist angemeldet.";
      } catch (error) {
        $("#authMessage").textContent = `Anmeldung fehlgeschlagen: ${error.message}`;
      }
    });

    $("#signUpButton")?.addEventListener("click", async () => {
      const email = $("#authEmail").value.trim();
      const password = $("#authPassword").value;
      if (!email || password.length < 6) {
        $("#authMessage").textContent = "Bitte gib eine gültige E-Mail-Adresse und ein Passwort mit mindestens 6 Zeichen ein.";
        return;
      }
      $("#authMessage").textContent = "Konto wird erstellt …";
      try {
        await signUp(email, password);
      } catch (error) {
        $("#authMessage").textContent = `Konto konnte nicht erstellt werden: ${error.message}`;
      }
    });

    $("#signOutButton")?.addEventListener("click", async () => {
      const { error } = await db.auth.signOut();
      if (error) showNotice(`Abmelden fehlgeschlagen: ${error.message}`, true);
    });

    $("#createHouseholdForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = $("#householdName").value.trim();
      if (!name) return;
      $("#householdMessage").textContent = "Haushalt wird erstellt …";
      try {
        await createHousehold(name);
      } catch (error) {
        $("#householdMessage").textContent = `Fehler: ${error.message}`;
      }
    });

    $("#joinHouseholdForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const code = $("#inviteCode").value.trim();
      if (!code) return;
      $("#householdMessage").textContent = "Einladungscode wird geprüft …";
      try {
        await joinHousehold(code);
      } catch (error) {
        $("#householdMessage").textContent = `Beitritt fehlgeschlagen: ${error.message}`;
      }
    });

    $$(".tab").forEach((tab) => tab.addEventListener("click", () => {
      $$(".tab").forEach((x) => x.classList.toggle("active", x === tab));
      $$(".panel").forEach((panel) => panel.classList.toggle("active", panel.id === tab.dataset.tab));
    }));

    $("#addOpen")?.addEventListener("click", () => $("#itemDialog")?.showModal());
    $("#emptyAdd")?.addEventListener("click", () => $("#itemDialog")?.showModal());
    $("#closeDialog")?.addEventListener("click", () => $("#itemDialog")?.close());
    $("#cancelDialog")?.addEventListener("click", () => $("#itemDialog")?.close());

    $("#itemForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!user || !household) {
        return showNotice("Bitte melde dich an und erstelle oder wähle zuerst einen Haushalt.", true);
      }
      const name = $("#productName").value.trim();
      const quantity = Number($("#quantity").value);
      if (!name || !Number.isFinite(quantity) || quantity <= 0) return;

      const row = {
        household_id: household.id,
        name,
        quantity,
        unit: $("#unit").value,
        category: $("#category").value,
        expires_on: $("#expiry").value || null,
        created_by: user.id
      };

      const { error } = await db.from("pantry_items").insert(row);
      if (error) return showNotice(`Speichern fehlgeschlagen: ${error.message}`, true);

      $("#itemForm").reset();
      $("#quantity").value = "1";
      $("#itemDialog").close();

      try {
        await loadSharedData();
        showNotice("Lebensmittel gespeichert.");
      } catch (err) {
        showNotice(`Gespeichert, aber Aktualisierung fehlgeschlagen: ${err.message}`, true);
      }
    });

    $("#items")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-delete-food]");
      if (!button || !household) return;
      const { error } = await db.from("pantry_items").delete()
        .eq("id", button.dataset.deleteFood)
        .eq("household_id", household.id);
      if (error) return showNotice(`Löschen fehlgeschlagen: ${error.message}`, true);
      await loadSharedData();
    });

    $("#search")?.addEventListener("input", renderFoods);
    $("#filter")?.addEventListener("change", renderFoods);
    $("#refreshRecipes")?.addEventListener("click", renderRecipes);
    $("#shoppingForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!user || !household) {
        return showNotice("Bitte melde dich an und erstelle zuerst einen Haushalt.", true);
      }
      const name = $("#shoppingInput").value.trim();
      if (!name) return;

      const { error } = await db.from("shopping_items").insert({
        household_id: household.id,
        name,
        quantity: 1,
        unit: "Stück",
        is_checked: false,
        created_by: user.id
      });

      if (error) return showNotice(`Eintrag konnte nicht gespeichert werden: ${error.message}`, true);
      $("#shoppingInput").value = "";
      await loadSharedData();
    });

    $("#shoppingItems")?.addEventListener("change", async (event) => {
  const checkbox = event.target.closest("[data-check-shopping]");
  if (!checkbox || !household) return;

  const item = shopping.find(
    (x) => x.id === checkbox.dataset.checkShopping
  );

  if (!item) return;

  // Bereits erledigten Einkauf wieder öffnen
  if (!checkbox.checked) {
    const { error } = await db.from("shopping_items")
      .update({ is_checked: false })
      .eq("id", item.id)
      .eq("household_id", household.id);

    if (error) {
      showNotice(`Änderung fehlgeschlagen: ${error.message}`, true);
      return;
    }

    await loadSharedData();
    return;
  }

  // Menge abfragen
  const quantityInput = prompt(
    `Wie viel ${item.name} hast du gekauft?`,
    String(item.quantity ?? 1)
  );

  if (quantityInput === null) {
    checkbox.checked = false;
    return;
  }

  const quantity = Number(quantityInput);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    checkbox.checked = false;
    showNotice("Bitte gib eine gültige Menge ein.", true);
    return;
  }

  // Mindesthaltbarkeitsdatum abfragen
  const expiry = prompt(
    "Mindesthaltbarkeitsdatum (Format JJJJ-MM-TT). Leer lassen, wenn unbekannt."
  );

  if (expiry === null) {
    checkbox.checked = false;
    return;
  }

  if (
    expiry &&
    !/^\d{4}-\d{2}-\d{2}$/.test(expiry)
  ) {
    checkbox.checked = false;
    showNotice("Bitte gib das Datum im Format JJJJ-MM-TT ein.", true);
    return;
  }

  checkbox.disabled = true;

  try {
    // Lebensmittel in den Vorrat übernehmen
    const { error: insertError } = await db
      .from("pantry_items")
      .insert({
        household_id: household.id,
        name: item.name,
        quantity,
        unit: item.unit || "Stück",
        category: "Sonstiges",
        expires_on: expiry || null,
        created_by: user.id
      });

    if (insertError) throw insertError;

    // Erfolgreich übernommen: aus Einkaufsliste entfernen
    const { error: deleteError } = await db
      .from("shopping_items")
      .delete()
      .eq("id", item.id)
      .eq("household_id", household.id);

    if (deleteError) {
      await loadSharedData();
      showNotice(
        "Im Vorrat gespeichert. Der Einkauf konnte aber nicht aus der Einkaufsliste entfernt werden. Bitte dort manuell löschen.",
        true
      );
      return;
    }

    await loadSharedData();
    showNotice(`${item.name} wurde in den Vorrat übernommen.`);

  } catch (error) {
    checkbox.checked = false;
    showNotice(`Übernahme fehlgeschlagen: ${error.message}`, true);
  } finally {
    checkbox.disabled = false;
  }
});

    $("#shoppingItems")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-delete-shopping]");
      if (!button || !household) return;

      const { error } = await db.from("shopping_items").delete()
        .eq("id", button.dataset.deleteShopping)
        .eq("household_id", household.id);

      if (error) return showNotice(`Löschen fehlgeschlagen: ${error.message}`, true);
      await loadSharedData();
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      $("#installBtn")?.classList.remove("hidden");
    });

    $("#installBtn")?.addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      $("#installBtn")?.classList.add("hidden");
    });
  }

  async function init() {
    addAccountInterface();
    bindEvents();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js")
        .catch((error) => console.warn("Service Worker:", error));
    }

    const { data, error } = await db.auth.getSession();

    if (error) {
      showNotice(`Anmeldestatus konnte nicht geprüft werden: ${error.message}`, true);
    } else {
      await handleAuthSession(data.session);
    }

    db.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => handleAuthSession(session), 0);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
