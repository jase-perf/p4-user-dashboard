// P4 User Dashboard — Client-side Application
//
// Security note: All P4-sourced data (usernames, emails, fullNames, server names,
// error messages) is escaped through escHtml() or escAttr() before being inserted
// into the DOM via innerHTML. Only static structural HTML (table headers, labels,
// CSS classes, layout) is written directly. This prevents XSS from malicious P4 data.

"use strict";

// ---------------------------------------------------------------------------
// Security helpers — used for ALL dynamic P4 data before DOM insertion
// ---------------------------------------------------------------------------

function escHtml(s) {
    if (s == null) return "";
    const div = document.createElement("div");
    div.textContent = String(s);
    return div.innerHTML;
}

function escAttr(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;");
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatDate(ts) {
    if (!ts) return "Never";
    const d = new Date(ts * 1000);
    return d.toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
    });
}

function formatDateFull(ts) {
    if (!ts) return "Never";
    const d = new Date(ts * 1000);
    return d.toLocaleString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function daysSince(ts) {
    if (!ts) return Infinity;
    return Math.floor((Date.now() / 1000 - ts) / 86400);
}

// ---------------------------------------------------------------------------
// Application State
// ---------------------------------------------------------------------------

const app = {
    data: { users: {}, servers: {} },
    currentView: "users",
    userSort: { key: "latestAccess", dir: "desc" },
    serverSort: { key: "name", dir: "asc" },
    expandedEmails: new Set(),
    serverFilter: "",  // set when clicking a server row

    // Processed user rows (computed once, filtered/sorted on demand)
    processedUsers: [],
};

// ---------------------------------------------------------------------------
// Data Loading
// ---------------------------------------------------------------------------

app.load = async function () {
    try {
        const res = await fetch("/api/data");
        if (!res.ok) throw new Error("Failed to load data");
        app.data = await res.json();
        app.processUsers();
        app.updateTopBar();
        app.renderCurrentView();
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("view-" + app.currentView).classList.remove("hidden");
    } catch (err) {
        document.getElementById("loading").classList.add("hidden");
        app.showError("Failed to load data: " + err.message);
    }
};

app.refreshAll = async function () {
    const btn = document.getElementById("btn-refresh");
    btn.disabled = true;
    btn.textContent = "Refreshing...";
    try {
        const res = await fetch("/api/refresh", { method: "POST" });
        if (!res.ok) throw new Error("Refresh failed");
        app.data = await res.json();
        app.processUsers();
        app.updateTopBar();
        app.renderCurrentView();
        app.hideError();
    } catch (err) {
        app.showError("Refresh failed: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Refresh";
    }
};

// ---------------------------------------------------------------------------
// Data Processing
// ---------------------------------------------------------------------------

app.processUsers = function () {
    const rows = [];
    for (const [email, userData] of Object.entries(app.data.users)) {
        const accounts = userData.accounts || [];
        if (accounts.length === 0) continue;

        // Display name: from the account with the most recent update
        let displayName = "";
        let latestUpdate = 0;
        let latestAccess = 0;
        const serverSet = new Set();
        const typeSet = new Set();

        // For oldest-latest-access: group by server, find max access per server,
        // then take the min of those maxes.
        const serverMaxAccess = {};

        for (const acct of accounts) {
            if (acct.update > latestUpdate) {
                latestUpdate = acct.update;
                displayName = acct.fullName;
            }
            if (acct.access > latestAccess) {
                latestAccess = acct.access;
            }
            serverSet.add(acct.server);
            typeSet.add(acct.type || "standard");

            const srv = acct.server;
            if (!serverMaxAccess[srv] || acct.access > serverMaxAccess[srv]) {
                serverMaxAccess[srv] = acct.access;
            }
        }

        const serverMaxValues = Object.values(serverMaxAccess);
        const oldestLatestAccess = serverMaxValues.length > 0
            ? Math.min(...serverMaxValues)
            : 0;

        rows.push({
            email,
            displayName,
            accounts,
            accountCount: accounts.length,
            serverCount: serverSet.size,
            servers: serverSet,
            latestAccess,
            oldestLatestAccess,
            types: Array.from(typeSet).sort().join(", "),
            typeSet,
        });
    }
    app.processedUsers = rows;
};

// ---------------------------------------------------------------------------
// Top Bar
// ---------------------------------------------------------------------------

app.updateTopBar = function () {
    const servers = app.data.servers || {};
    const serverNames = Object.keys(servers);
    const connectedCount = serverNames.filter(
        n => servers[n].status === "connected"
    ).length;

    const statsServers = document.getElementById("stat-servers");
    statsServers.textContent = "";
    statsServers.append("Servers: ");
    const serversStrong = document.createElement("strong");
    serversStrong.textContent = connectedCount + " / " + serverNames.length;
    statsServers.appendChild(serversStrong);

    // Count standard-type unique users and total accounts
    const standardEmails = new Set();
    let standardAccountCount = 0;
    for (const row of app.processedUsers) {
        let hasStandard = false;
        for (const acct of row.accounts) {
            if (acct.type === "standard") {
                standardAccountCount++;
                hasStandard = true;
            }
        }
        if (hasStandard) standardEmails.add(row.email);
    }

    const statsUsers = document.getElementById("stat-users");
    statsUsers.textContent = "";
    statsUsers.append("Unique Users: ");
    const usersStrong = document.createElement("strong");
    usersStrong.textContent = standardEmails.size;
    statsUsers.appendChild(usersStrong);

    const statsAccounts = document.getElementById("stat-accounts");
    statsAccounts.textContent = "";
    statsAccounts.append("Accounts: ");
    const accountsStrong = document.createElement("strong");
    accountsStrong.textContent = standardAccountCount;
    statsAccounts.appendChild(accountsStrong);

    // Licensed indicator
    app.fetchLicensedCount(standardEmails.size);
};

app.fetchLicensedCount = async function (uniqueCount) {
    try {
        const res = await fetch("/api/config");
        if (!res.ok) return;
        const cfg = await res.json();
        const el = document.getElementById("stat-licensed");
        if (cfg.licensedUniqueUsers) {
            const over = uniqueCount > cfg.licensedUniqueUsers;
            el.textContent = "";
            el.append("Licensed: ");
            const strong = document.createElement("strong");
            strong.textContent = uniqueCount + " / " + cfg.licensedUniqueUsers;
            strong.className = over ? "text-red-400" : "text-green-400";
            el.appendChild(strong);
            el.classList.remove("hidden");
        } else {
            el.classList.add("hidden");
        }
    } catch (_) {
        // Ignore config fetch failures for the top bar
    }
};

// ---------------------------------------------------------------------------
// View Switching
// ---------------------------------------------------------------------------

app.switchView = function (view) {
    app.currentView = view;
    document.querySelectorAll(".view").forEach(function (el) {
        el.classList.add("hidden");
    });
    document.getElementById("view-" + view).classList.remove("hidden");

    document.querySelectorAll(".tab-btn").forEach(function (btn) {
        btn.classList.toggle("active", btn.dataset.view === view);
    });

    app.renderCurrentView();
};

app.renderCurrentView = function () {
    switch (app.currentView) {
        case "users": app.renderUsers(); break;
        case "servers": app.renderServers(); break;
        case "config": app.renderConfig(); break;
    }
};

// ---------------------------------------------------------------------------
// Error Display
// ---------------------------------------------------------------------------

app.showError = function (msg) {
    const el = document.getElementById("error-banner");
    el.textContent = msg;
    el.classList.remove("hidden");
};

app.hideError = function () {
    document.getElementById("error-banner").classList.add("hidden");
};

// ---------------------------------------------------------------------------
// Users View
// ---------------------------------------------------------------------------

app.applyFilters = function () {
    app.renderUsers();
};

app.parseDateFilter = function (val) {
    // Parse filter values like "gt30", "lt7" into {op, days}
    if (!val) return null;
    var op = val.substring(0, 2);  // "gt" or "lt"
    var days = parseInt(val.substring(2), 10);
    return { op: op, days: days };
};

app.matchesDateFilter = function (timestamp, filter) {
    if (!filter) return true;
    var age = daysSince(timestamp);
    if (filter.op === "gt") return age > filter.days;
    if (filter.op === "lt") return age < filter.days;
    return true;
};

app.getFilteredUsers = function () {
    var searchVal = document.getElementById("filter-search").value.toLowerCase();
    var serverVal = document.getElementById("filter-server").value;
    var latestFilter = app.parseDateFilter(document.getElementById("filter-latest").value);
    var oldestFilter = app.parseDateFilter(document.getElementById("filter-oldest").value);
    var typeVal = document.getElementById("filter-type").value;

    var rows = app.processedUsers;

    // Text search (searches email, display name, and usernames)
    if (searchVal) {
        rows = rows.filter(function (r) {
            if (r.email.toLowerCase().includes(searchVal)) return true;
            if (r.displayName.toLowerCase().includes(searchVal)) return true;
            return r.accounts.some(function (a) {
                return a.username.toLowerCase().includes(searchVal);
            });
        });
    }

    // Server filter
    if (serverVal) {
        rows = rows.filter(function (r) { return r.servers.has(serverVal); });
    }

    // Latest Access filter
    if (latestFilter) {
        rows = rows.filter(function (r) {
            return app.matchesDateFilter(r.latestAccess, latestFilter);
        });
    }

    // Oldest Latest Access filter
    if (oldestFilter) {
        rows = rows.filter(function (r) {
            return app.matchesDateFilter(r.oldestLatestAccess, oldestFilter);
        });
    }

    // Type filter
    if (typeVal) {
        rows = rows.filter(function (r) { return r.typeSet.has(typeVal); });
    }

    return rows;
};

app.sortUsers = function (rows) {
    const key = app.userSort.key;
    const mult = app.userSort.dir === "asc" ? 1 : -1;

    rows.sort(function (a, b) {
        var va = a[key];
        var vb = b[key];
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        if (va < vb) return -1 * mult;
        if (va > vb) return 1 * mult;
        return 0;
    });
    return rows;
};

app.onUserSort = function (key) {
    if (app.userSort.key === key) {
        app.userSort.dir = app.userSort.dir === "asc" ? "desc" : "asc";
    } else {
        app.userSort.key = key;
        app.userSort.dir = key === "email" || key === "displayName" || key === "types"
            ? "asc" : "desc";
    }
    app.renderUsers();
};

app.renderUsers = function () {
    // Populate server filter dropdown
    var serverSelect = document.getElementById("filter-server");
    var currentServerVal = serverSelect.value;
    var serverNames = Object.keys(app.data.servers).sort();
    // Rebuild if count changed
    if (serverSelect.options.length !== serverNames.length + 1) {
        serverSelect.textContent = "";
        var allOpt = document.createElement("option");
        allOpt.value = "";
        allOpt.textContent = "All Servers";
        serverSelect.appendChild(allOpt);
        for (var si = 0; si < serverNames.length; si++) {
            var opt = document.createElement("option");
            opt.value = serverNames[si];
            opt.textContent = serverNames[si];
            serverSelect.appendChild(opt);
        }
    }
    // Restore value (e.g., if set from server click)
    if (app.serverFilter) {
        serverSelect.value = app.serverFilter;
        app.serverFilter = "";
    } else if (currentServerVal) {
        serverSelect.value = currentServerVal;
    }

    var rows = app.getFilteredUsers();
    rows = app.sortUsers(rows);

    // Update sort indicators
    document.querySelectorAll("#users-table .sortable").forEach(function (th) {
        th.classList.remove("sort-asc", "sort-desc");
        if (th.dataset.sort === app.userSort.key) {
            th.classList.add("sort-" + app.userSort.dir);
        }
        th.onclick = function () { app.onUserSort(th.dataset.sort); };
    });

    // Build rows using DOM methods
    var tbody = document.getElementById("users-tbody");
    tbody.textContent = "";

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var expanded = app.expandedEmails.has(row.email);

        var tr = document.createElement("tr");
        tr.className = "user-row" + (expanded ? " expanded" : "");
        tr.dataset.email = row.email;
        tr.onclick = (function (email) {
            return function () { app.toggleUserRow(email); };
        })(row.email);

        var cells = [
            row.email,
            row.displayName,
            String(row.accountCount),
            String(row.serverCount),
            formatDate(row.latestAccess),
            formatDate(row.oldestLatestAccess),
            row.types,
        ];
        for (var c = 0; c < cells.length; c++) {
            var td = document.createElement("td");
            td.textContent = cells[c];
            tr.appendChild(td);
        }
        tbody.appendChild(tr);

        if (expanded) {
            app.appendUserDetailRow(tbody, row);
        }
    }

    // User count
    document.getElementById("user-count").textContent =
        "Showing " + rows.length + " of " + app.processedUsers.length + " users";
};

app.toggleUserRow = function (email) {
    if (app.expandedEmails.has(email)) {
        app.expandedEmails.delete(email);
    } else {
        app.expandedEmails.add(email);
    }
    app.renderUsers();
};

app.appendUserDetailRow = function (tbody, row) {
    var detailTr = document.createElement("tr");
    detailTr.className = "detail-row";
    var detailTd = document.createElement("td");
    detailTd.colSpan = 7;

    var innerTable = document.createElement("table");
    innerTable.className = "data-table w-full";

    // Header
    var thead = document.createElement("thead");
    var headerTr = document.createElement("tr");
    var headers = ["Username", "Full Name", "Server", "Last Access", "Updated", "Type", "Actions"];
    for (var h = 0; h < headers.length; h++) {
        var th = document.createElement("th");
        th.textContent = headers[h];
        headerTr.appendChild(th);
    }
    thead.appendChild(headerTr);
    innerTable.appendChild(thead);

    // Body
    var innerTbody = document.createElement("tbody");
    for (var a = 0; a < row.accounts.length; a++) {
        var acct = row.accounts[a];
        var acctTr = document.createElement("tr");

        var acctCells = [
            acct.username,
            acct.fullName,
            acct.server,
            formatDateFull(acct.access),
            formatDateFull(acct.update),
            acct.type,
        ];
        for (var ac = 0; ac < acctCells.length; ac++) {
            var acctTd = document.createElement("td");
            acctTd.textContent = acctCells[ac];
            acctTr.appendChild(acctTd);
        }

        // Actions cell
        var actionsTd = document.createElement("td");
        actionsTd.className = "flex gap-2";

        var editBtn = document.createElement("button");
        editBtn.className = "btn-secondary btn-sm";
        editBtn.textContent = "Edit";
        editBtn.onclick = (function (server, username, fullName, email) {
            return function (e) {
                e.stopPropagation();
                app.editUser(server, username, fullName, email);
            };
        })(acct.server, acct.username, acct.fullName, acct.email || row.email);
        actionsTd.appendChild(editBtn);

        var deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-danger btn-sm";
        deleteBtn.textContent = "Delete";
        deleteBtn.onclick = (function (server, username) {
            return function (e) {
                e.stopPropagation();
                app.confirmDeleteUser(server, username);
            };
        })(acct.server, acct.username);
        actionsTd.appendChild(deleteBtn);

        acctTr.appendChild(actionsTd);
        innerTbody.appendChild(acctTr);
    }
    innerTable.appendChild(innerTbody);
    detailTd.appendChild(innerTable);
    detailTr.appendChild(detailTd);
    tbody.appendChild(detailTr);
};

// ---------------------------------------------------------------------------
// User Actions
// ---------------------------------------------------------------------------

// --- Edit User Modal ---

app._editContext = null;

app.editUser = async function (server, username, currentName, currentEmail) {
    app._editContext = { server: server, username: username, originalName: currentName, originalEmail: currentEmail };

    // Show modal with loading state
    document.getElementById("edit-loading").classList.remove("hidden");
    document.getElementById("edit-form").classList.add("hidden");
    document.getElementById("edit-password-result").classList.add("hidden");
    document.getElementById("edit-overlay").classList.remove("hidden");

    // Fetch full user detail to get AuthMethod
    try {
        var res = await fetch(
            "/api/servers/" + encodeURIComponent(server) +
            "/users/" + encodeURIComponent(username) + "/detail"
        );
        var detail = await res.json();
        if (!detail.success) {
            app.showError("Failed to load user details: " + (detail.error || "Unknown error"));
            app.editClose();
            return;
        }

        app._editContext.authMethod = detail.authMethod;

        document.getElementById("edit-username").textContent = username;
        document.getElementById("edit-server").textContent = server;
        document.getElementById("edit-fullname").value = detail.fullName;
        document.getElementById("edit-email").value = detail.email;

        // Show password reset only for non-SSO users
        var isSSO = detail.authMethod && detail.authMethod !== "perforce";
        document.getElementById("edit-password-section").classList.toggle("hidden", isSSO);
        document.getElementById("edit-sso-notice").classList.toggle("hidden", !isSSO);
        if (isSSO) {
            document.getElementById("edit-auth-method").textContent = detail.authMethod;
        }

        document.getElementById("edit-loading").classList.add("hidden");
        document.getElementById("edit-form").classList.remove("hidden");
    } catch (err) {
        app.showError("Failed to load user details: " + err.message);
        app.editClose();
    }
};

app.editSave = async function () {
    var ctx = app._editContext;
    if (!ctx) return;

    var newName = document.getElementById("edit-fullname").value.trim();
    var newEmail = document.getElementById("edit-email").value.trim();

    var body = {};
    if (newName !== ctx.originalName) body.fullName = newName;
    if (newEmail !== ctx.originalEmail) body.email = newEmail;

    if (Object.keys(body).length === 0) {
        app.editClose();
        return;
    }

    try {
        var res = await fetch(
            "/api/servers/" + encodeURIComponent(ctx.server) +
            "/users/" + encodeURIComponent(ctx.username),
            { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        );
        var result = await res.json();
        if (result.success) {
            for (var userData of Object.values(app.data.users)) {
                for (var acct of userData.accounts) {
                    if (acct.server === ctx.server && acct.username === ctx.username) {
                        if (body.fullName !== undefined) acct.fullName = body.fullName;
                        if (body.email !== undefined) acct.email = body.email;
                    }
                }
            }
            app.processUsers();
            app.renderUsers();
            app.editClose();
        } else {
            app.showError("Edit failed: " + (result.error || "Unknown error"));
        }
    } catch (err) {
        app.showError("Edit failed: " + err.message);
    }
};

app.doPasswordReset = async function () {
    var ctx = app._editContext;
    if (!ctx) return;

    // Generate random password: 12 chars, at least one number and one special char
    var chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    var nums = "23456789";
    var specials = "!@#$%&*?";
    var pw = "";
    for (var i = 0; i < 9; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    pw += nums[Math.floor(Math.random() * nums.length)];
    pw += specials[Math.floor(Math.random() * specials.length)];
    // Shuffle
    pw = pw.split("").sort(function () { return Math.random() - 0.5; }).join("");

    var btn = document.getElementById("edit-reset-btn");
    btn.disabled = true;
    btn.textContent = "Resetting...";

    try {
        var res = await fetch(
            "/api/servers/" + encodeURIComponent(ctx.server) +
            "/users/" + encodeURIComponent(ctx.username) + "/reset-password",
            { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: pw, forceReset: true }) }
        );
        var result = await res.json();
        if (result.success) {
            document.getElementById("edit-new-password").textContent = pw;
            document.getElementById("edit-password-result").classList.remove("hidden");
            btn.textContent = "Reset Again";
        } else {
            app.showError("Password reset failed: " + (result.error || "Unknown error"));
            btn.textContent = "Generate & Reset Password";
        }
    } catch (err) {
        app.showError("Password reset failed: " + err.message);
        btn.textContent = "Generate & Reset Password";
    } finally {
        btn.disabled = false;
    }
};

app.editClose = function () {
    document.getElementById("edit-overlay").classList.add("hidden");
    app._editContext = null;
};

app.confirmDeleteUser = function (server, username) {
    document.getElementById("modal-title").textContent = "Delete User";
    document.getElementById("modal-body").textContent =
        "Are you sure you want to delete user \"" + username + "\" from server \"" + server + "\"? This cannot be undone.";
    document.getElementById("modal-confirm").onclick = function () {
        app.deleteUser(server, username);
    };
    document.getElementById("modal-overlay").classList.remove("hidden");
};

app.deleteUser = async function (server, username) {
    app.modalClose();
    try {
        var res = await fetch(
            "/api/servers/" + encodeURIComponent(server) +
            "/users/" + encodeURIComponent(username),
            { method: "DELETE" }
        );
        var result = await res.json();
        if (result.success) {
            // Remove from local data
            for (var entry of Object.entries(app.data.users)) {
                var email = entry[0];
                var userData = entry[1];
                userData.accounts = userData.accounts.filter(function (a) {
                    return !(a.server === server && a.username === username);
                });
                if (userData.accounts.length === 0) {
                    delete app.data.users[email];
                }
            }
            app.processUsers();
            app.updateTopBar();
            app.renderUsers();
        } else {
            app.showError("Delete failed: " + (result.error || "Unknown error"));
        }
    } catch (err) {
        app.showError("Delete failed: " + err.message);
    }
};

app.modalClose = function () {
    document.getElementById("modal-overlay").classList.add("hidden");
};

// Close modals on overlay click
document.getElementById("modal-overlay").addEventListener("click", function (e) {
    if (e.target === this) app.modalClose();
});
document.getElementById("edit-overlay").addEventListener("click", function (e) {
    if (e.target === this) app.editClose();
});

// ---------------------------------------------------------------------------
// Servers View
// ---------------------------------------------------------------------------

app.onServerSort = function (key) {
    if (app.serverSort.key === key) {
        app.serverSort.dir = app.serverSort.dir === "asc" ? "desc" : "asc";
    } else {
        app.serverSort.key = key;
        app.serverSort.dir = key === "name" || key === "port" || key === "status"
            ? "asc" : "desc";
    }
    app.renderServers();
};

app.renderServers = function () {
    var servers = app.data.servers || {};
    var users = app.data.users || {};

    // Count total accounts per server
    var serverAccountCounts = {};
    for (var userData of Object.values(users)) {
        for (var acct of userData.accounts) {
            serverAccountCounts[acct.server] = (serverAccountCounts[acct.server] || 0) + 1;
        }
    }

    var rows = Object.entries(servers).map(function (entry) {
        var name = entry[0];
        var info = entry[1];
        var licensed = info.licensedSlots;
        var used = info.usedSlots;
        var utilization = (licensed && used != null) ? (used / licensed) : null;
        return {
            name: name,
            port: info.port,
            licensedSlots: licensed,
            usedSlots: used,
            utilization: utilization,
            totalAccounts: serverAccountCounts[name] || 0,
            status: info.status,
            error: info.error,
        };
    });

    // Sort
    var key = app.serverSort.key;
    var mult = app.serverSort.dir === "asc" ? 1 : -1;
    rows.sort(function (a, b) {
        var va = a[key];
        var vb = b[key];
        if (va == null) va = -1;
        if (vb == null) vb = -1;
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        if (va < vb) return -1 * mult;
        if (va > vb) return 1 * mult;
        return 0;
    });

    // Update sort indicators
    document.querySelectorAll("#servers-table .sortable").forEach(function (th) {
        th.classList.remove("sort-asc", "sort-desc");
        if (th.dataset.sort === app.serverSort.key) {
            th.classList.add("sort-" + app.serverSort.dir);
        }
        th.onclick = function () { app.onServerSort(th.dataset.sort); };
    });

    // Build rows using DOM methods
    var tbody = document.getElementById("servers-tbody");
    tbody.textContent = "";

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var tr = document.createElement("tr");
        tr.className = "cursor-pointer";
        tr.onclick = (function (name) {
            return function () { app.clickServer(name); };
        })(row.name);

        // Name
        var tdName = document.createElement("td");
        tdName.textContent = row.name;
        tr.appendChild(tdName);

        // Port
        var tdPort = document.createElement("td");
        tdPort.textContent = row.port;
        tr.appendChild(tdPort);

        // Licensed
        var tdLicensed = document.createElement("td");
        tdLicensed.textContent = row.licensedSlots != null ? row.licensedSlots : "-";
        tr.appendChild(tdLicensed);

        // Used
        var tdUsed = document.createElement("td");
        tdUsed.textContent = row.usedSlots != null ? row.usedSlots : "-";
        tr.appendChild(tdUsed);

        // Utilization
        var tdUtil = document.createElement("td");
        tdUtil.className = "flex items-center";
        if (row.utilization != null) {
            var pct = Math.round(row.utilization * 100);
            var color = pct > 90 ? "bg-red-500"
                : pct > 70 ? "bg-yellow-500"
                : "bg-green-500";
            var barOuter = document.createElement("div");
            barOuter.className = "util-bar";
            var barInner = document.createElement("div");
            barInner.className = "util-bar-fill " + color;
            barInner.style.width = pct + "%";
            barOuter.appendChild(barInner);
            tdUtil.appendChild(barOuter);
            var pctLabel = document.createElement("span");
            pctLabel.className = "text-xs text-gray-400 ml-2";
            pctLabel.textContent = pct + "%";
            tdUtil.appendChild(pctLabel);
        } else {
            tdUtil.textContent = "-";
        }
        tr.appendChild(tdUtil);

        // Total accounts
        var tdAccounts = document.createElement("td");
        tdAccounts.textContent = row.totalAccounts;
        tr.appendChild(tdAccounts);

        // Status
        var tdStatus = document.createElement("td");
        var statusClass = row.status === "connected"
            ? "badge-connected"
            : row.status === "auth_failed"
                ? "badge-auth-failed"
                : "badge-error";
        var badge = document.createElement("span");
        badge.className = "badge " + statusClass;
        badge.textContent = row.status;
        tdStatus.appendChild(badge);
        if (row.error) {
            var errorSpan = document.createElement("span");
            errorSpan.className = "text-xs text-red-400 ml-2";
            errorSpan.textContent = row.error;
            tdStatus.appendChild(errorSpan);
        }
        tr.appendChild(tdStatus);

        tbody.appendChild(tr);
    }
};

app.clickServer = function (name) {
    app.serverFilter = name;
    document.getElementById("filter-server").value = name;
    app.switchView("users");
};

// ---------------------------------------------------------------------------
// Config View
// ---------------------------------------------------------------------------

app.configData = null;

app.renderConfig = async function () {
    try {
        var res = await fetch("/api/config");
        if (!res.ok) throw new Error("Failed to load config");
        app.configData = await res.json();
    } catch (err) {
        app.showError("Failed to load config: " + err.message);
        return;
    }

    document.getElementById("config-licensed").value =
        app.configData.licensedUniqueUsers || "";

    app.renderConfigServers();
};

app.renderConfigServers = function () {
    var tbody = document.getElementById("config-servers-tbody");
    var servers = app.configData.servers || [];
    tbody.textContent = "";

    for (var i = 0; i < servers.length; i++) {
        var s = servers[i];
        var tr = document.createElement("tr");
        tr.dataset.idx = i;

        // Name input
        var tdName = document.createElement("td");
        var nameInput = document.createElement("input");
        nameInput.className = "config-input";
        nameInput.dataset.field = "name";
        nameInput.value = s.name;
        tdName.appendChild(nameInput);
        tr.appendChild(tdName);

        // Port input
        var tdPort = document.createElement("td");
        var portInput = document.createElement("input");
        portInput.className = "config-input";
        portInput.dataset.field = "port";
        portInput.value = s.port;
        tdPort.appendChild(portInput);
        tr.appendChild(tdPort);

        // User input
        var tdUser = document.createElement("td");
        var userInput = document.createElement("input");
        userInput.className = "config-input";
        userInput.dataset.field = "user";
        userInput.value = s.user || "";
        userInput.placeholder = "(default)";
        tdUser.appendChild(userInput);
        tr.appendChild(tdUser);

        // Actions
        var tdActions = document.createElement("td");
        tdActions.className = "flex gap-2";

        var testBtn = document.createElement("button");
        testBtn.className = "btn-secondary btn-sm";
        testBtn.textContent = "Test";
        testBtn.onclick = (function (idx, btn) {
            return function () { app.configTestServer(idx, btn); };
        })(i, testBtn);
        tdActions.appendChild(testBtn);

        var removeBtn = document.createElement("button");
        removeBtn.className = "btn-danger btn-sm";
        removeBtn.textContent = "Remove";
        removeBtn.onclick = (function (idx) {
            return function () { app.configRemoveServer(idx); };
        })(i);
        tdActions.appendChild(removeBtn);

        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    }
};

app.configAddServer = function () {
    app.configData.servers.push({ name: "new-server", port: "ssl:server:1666", user: "" });
    app.renderConfigServers();
};

app.configRemoveServer = function (idx) {
    app.configData.servers.splice(idx, 1);
    app.renderConfigServers();
};

app.configTestServer = async function (idx, btn) {
    // Save config first so the server exists in the backend
    await app.configSave();

    var row = document.querySelector('#config-servers-tbody tr[data-idx="' + idx + '"]');
    var name = row.querySelector('[data-field="name"]').value;

    btn.disabled = true;
    btn.textContent = "Testing...";

    try {
        var res = await fetch(
            "/api/servers/" + encodeURIComponent(name) + "/test",
            { method: "POST" }
        );
        var result = await res.json();
        var labels = {
            "connected": "Connected",
            "trust_failed": "Trust Failed",
            "auth_failed": "Auth Failed",
            "permission_denied": "No Permission",
            "error": "Error",
        };
        btn.textContent = labels[result.status] || result.status;
        btn.classList.remove("btn-secondary", "btn-primary", "btn-danger");
        if (result.status === "connected") {
            btn.classList.add("btn-primary");
        } else {
            btn.classList.add("btn-danger");
            if (result.error) {
                app.showError(labels[result.status] + ": " + result.error);
            }
        }
    } catch (err) {
        btn.textContent = "Error";
        app.showError("Test failed: " + err.message);
    } finally {
        btn.disabled = false;
    }
};

app.configSave = async function () {
    // Collect values from inputs
    var rows = document.querySelectorAll("#config-servers-tbody tr");
    var servers = [];
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var name = row.querySelector('[data-field="name"]').value.trim();
        var port = row.querySelector('[data-field="port"]').value.trim();
        var user = row.querySelector('[data-field="user"]').value.trim();
        if (!name || !port) continue;
        var entry = { name: name, port: port };
        if (user) entry.user = user;
        servers.push(entry);
    }

    var licensedVal = document.getElementById("config-licensed").value.trim();
    var payload = {
        port: app.configData.port,
        licensedUniqueUsers: licensedVal ? parseInt(licensedVal, 10) : null,
        servers: servers,
    };

    var statusEl = document.getElementById("config-status");
    try {
        var res = await fetch("/api/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        var result = await res.json();
        if (result.success) {
            statusEl.textContent = "Configuration saved.";
            statusEl.className = "mt-3 text-sm text-green-400";
            statusEl.classList.remove("hidden");
            app.configData = payload;
        } else {
            throw new Error(result.error || "Unknown error");
        }
    } catch (err) {
        statusEl.textContent = "Save failed: " + err.message;
        statusEl.className = "mt-3 text-sm text-red-400";
        statusEl.classList.remove("hidden");
    }
};

// ---------------------------------------------------------------------------
// Keyboard Shortcuts
// ---------------------------------------------------------------------------

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        app.modalClose();
        app.editClose();
    }
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

app.load();
