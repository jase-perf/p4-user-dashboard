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
// Internationalization
// ---------------------------------------------------------------------------

var LANG = {
    en: {
        // Top bar
        title: "P4 User Dashboard",
        servers: "Servers",
        uniqueUsers: "Unique Users",
        accounts: "Accounts",
        licensed: "Licensed",
        refresh: "Refresh",
        refreshing: "Refreshing...",

        // Tabs
        tabUsers: "Users",
        tabServers: "Servers",
        tabConfig: "Config",

        // Users table headers
        email: "Email",
        displayName: "Display Name",
        accountCount: "Accounts",
        serverCount: "Servers",
        latestAccess: "Latest Access",
        oldestLatestAccess: "Oldest Latest Access",
        types: "Type(s)",

        // Filter placeholders
        searchPlaceholder: "Search...",
        allServers: "All Servers",
        any: "Any",
        all: "All",
        newerThan: "Newer than",
        olderThan: "Older than",

        // Filter options
        lt7days: "< 7 days",
        lt30days: "< 30 days",
        lt90days: "< 90 days",
        gt30days: "> 30 days",
        gt60days: "> 60 days",
        gt90days: "> 90 days",
        gt180days: "> 180 days",
        gt365days: "> 365 days",

        // Type options
        standard: "Standard",
        service: "Service",
        operator: "Operator",

        // Users detail
        username: "Username",
        fullName: "Full Name",
        server: "Server",
        lastAccess: "Last Access",
        updated: "Updated",
        type: "Type",
        actions: "Actions",
        edit: "Edit",
        delete: "Delete",

        // Showing count
        showingOf: function(shown, total) { return "Showing " + shown + " of " + total + " users"; },

        // Servers table
        name: "Name",
        connection: "Connection",
        licensedSlots: "Licensed",
        usedSlots: "Used",
        utilization: "Utilization",
        status: "Status",

        // Config
        dashboardConfig: "Dashboard Configuration",
        licensedUniqueUsers: "Licensed Unique Users",
        licensedDesc: "Total licensed seats across all servers (for the top-bar indicator).",
        serversHeading: "Servers",
        portLabel: "Port (host:port)",
        user: "User",
        addServer: "+ Add Server",
        saveConfig: "Save Config",
        configSaved: "Configuration saved.",
        test: "Test",
        remove: "Remove",
        testing: "Testing...",

        // Edit modal
        editUser: "Edit User",
        onServer: "on",
        loadingDetails: "Loading user details...",
        passwordReset: "Password Reset",
        generateReset: "Generate & Reset Password",
        resetAgain: "Reset Again",
        passwordDesc: "Assigns a random password and forces the user to change it on next login.",
        tempPassword: "New temporary password (copy and share with user):",
        ssoNotice: function(method) { return "This account uses SSO authentication (" + method + "). Password reset is not available."; },
        saveChanges: "Save Changes",
        cancel: "Cancel",

        // Delete modal
        deleteUser: "Delete User",
        deleteConfirm: function(user, server) { return 'Are you sure you want to delete user "' + user + '" from server "' + server + '"? This cannot be undone.'; },

        // Test connection statuses
        connected: "Connected",
        trustFailed: "Trust Failed",
        authFailed: "Auth Failed",
        noPermission: "No Permission",
        error: "Error",

        // Loading
        loadingData: "Loading data from servers...",
    },
    ja: {
        title: "P4 ユーザーダッシュボード",
        servers: "サーバー",
        uniqueUsers: "ユニークユーザー",
        accounts: "アカウント",
        licensed: "ライセンス",
        refresh: "更新",
        refreshing: "更新中...",

        tabUsers: "ユーザー",
        tabServers: "サーバー",
        tabConfig: "設定",

        email: "メール",
        displayName: "表示名",
        accountCount: "アカウント数",
        serverCount: "サーバー数",
        latestAccess: "最終アクセス",
        oldestLatestAccess: "最古の最終アクセス",
        types: "タイプ",

        searchPlaceholder: "検索...",
        allServers: "全サーバー",
        any: "全て",
        all: "全て",
        newerThan: "以内",
        olderThan: "以上",

        lt7days: "7日以内",
        lt30days: "30日以内",
        lt90days: "90日以内",
        gt30days: "30日以上",
        gt60days: "60日以上",
        gt90days: "90日以上",
        gt180days: "180日以上",
        gt365days: "365日以上",

        standard: "標準",
        service: "サービス",
        operator: "オペレーター",

        username: "ユーザー名",
        fullName: "氏名",
        server: "サーバー",
        lastAccess: "最終アクセス",
        updated: "更新日",
        type: "タイプ",
        actions: "操作",
        edit: "編集",
        delete: "削除",

        showingOf: function(shown, total) { return total + " 件中 " + shown + " 件を表示"; },

        name: "名前",
        connection: "接続先",
        licensedSlots: "ライセンス数",
        usedSlots: "使用数",
        utilization: "使用率",
        status: "ステータス",

        dashboardConfig: "ダッシュボード設定",
        licensedUniqueUsers: "ライセンスユニークユーザー数",
        licensedDesc: "全サーバーの合計ライセンス数（トップバーの表示用）",
        serversHeading: "サーバー",
        portLabel: "ポート（ホスト:ポート）",
        user: "ユーザー",
        addServer: "＋ サーバー追加",
        saveConfig: "設定を保存",
        configSaved: "設定を保存しました。",
        test: "テスト",
        remove: "削除",
        testing: "テスト中...",

        editUser: "ユーザー編集",
        onServer: "（サーバー：",
        loadingDetails: "ユーザー情報を読み込み中...",
        passwordReset: "パスワードリセット",
        generateReset: "パスワードを生成してリセット",
        resetAgain: "再リセット",
        passwordDesc: "ランダムなパスワードを設定し、次回ログイン時に変更を要求します。",
        tempPassword: "新しい一時パスワード（ユーザーに共有してください）：",
        ssoNotice: function(method) { return "このアカウントはSSO認証（" + method + "）を使用しています。パスワードリセットは利用できません。"; },
        saveChanges: "変更を保存",
        cancel: "キャンセル",

        deleteUser: "ユーザー削除",
        deleteConfirm: function(user, server) { return 'サーバー「' + server + '」のユーザー「' + user + '」を削除しますか？この操作は元に戻せません。'; },

        connected: "接続済み",
        trustFailed: "信頼エラー",
        authFailed: "認証エラー",
        noPermission: "権限エラー",
        error: "エラー",

        loadingData: "サーバーからデータを読み込み中...",
    }
};

var _currentLang = "en";

function t(key) {
    var lang = (typeof app !== "undefined") ? app.lang : _currentLang;
    return LANG[lang][key] || LANG.en[key] || key;
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
    lang: "en",

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
    btn.textContent = t("refreshing");
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
        btn.textContent = t("refresh");
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
    statsServers.append(t("servers") + ": ");
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
    statsUsers.append(t("uniqueUsers") + ": ");
    const usersStrong = document.createElement("strong");
    usersStrong.textContent = standardEmails.size;
    statsUsers.appendChild(usersStrong);

    const statsAccounts = document.getElementById("stat-accounts");
    statsAccounts.textContent = "";
    statsAccounts.append(t("accounts") + ": ");
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
            el.append(t("licensed") + ": ");
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
// Language Switching
// ---------------------------------------------------------------------------

app.setLanguage = function (lang) {
    app.lang = lang;
    _currentLang = lang;
    var sel = document.getElementById("lang-select");
    if (sel) sel.value = lang;
    app.applyLanguage();
    app.renderCurrentView();
};

app.applyLanguage = function () {
    // Page title
    document.querySelector("#top-bar h1").textContent = t("title");

    // Tab buttons
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
        var view = btn.dataset.view;
        if (view === "users") btn.textContent = t("tabUsers");
        else if (view === "servers") btn.textContent = t("tabServers");
        else if (view === "config") btn.textContent = t("tabConfig");
    });

    // Top bar stat labels (preserve the <strong> content)
    var statServers = document.getElementById("stat-servers");
    var serversStrong = statServers.querySelector("strong");
    if (serversStrong) {
        var val = serversStrong.textContent;
        statServers.textContent = "";
        statServers.append(t("servers") + ": ");
        var s = document.createElement("strong");
        s.textContent = val;
        statServers.appendChild(s);
    }

    var statUsers = document.getElementById("stat-users");
    var usersStrong = statUsers.querySelector("strong");
    if (usersStrong) {
        var val = usersStrong.textContent;
        statUsers.textContent = "";
        statUsers.append(t("uniqueUsers") + ": ");
        var s = document.createElement("strong");
        s.textContent = val;
        statUsers.appendChild(s);
    }

    var statAccounts = document.getElementById("stat-accounts");
    var accountsStrong = statAccounts.querySelector("strong");
    if (accountsStrong) {
        var val = accountsStrong.textContent;
        statAccounts.textContent = "";
        statAccounts.append(t("accounts") + ": ");
        var s = document.createElement("strong");
        s.textContent = val;
        statAccounts.appendChild(s);
    }

    var statLicensed = document.getElementById("stat-licensed");
    var licensedStrong = statLicensed.querySelector("strong");
    if (licensedStrong) {
        var val = licensedStrong.textContent;
        var cls = licensedStrong.className;
        statLicensed.textContent = "";
        statLicensed.append(t("licensed") + ": ");
        var s = document.createElement("strong");
        s.textContent = val;
        s.className = cls;
        statLicensed.appendChild(s);
    }

    // Refresh button
    var refreshBtn = document.getElementById("btn-refresh");
    if (!refreshBtn.disabled) {
        refreshBtn.textContent = t("refresh");
    }

    // Loading text
    var loadingP = document.querySelector("#loading p");
    if (loadingP) loadingP.textContent = t("loadingData");

    // Users table headers
    var headerMap = {
        email: "email",
        displayName: "displayName",
        accountCount: "accountCount",
        serverCount: "serverCount",
        latestAccess: "latestAccess",
        oldestLatestAccess: "oldestLatestAccess",
        types: "types",
    };
    document.querySelectorAll("#users-table thead .sortable").forEach(function (th) {
        var sortKey = th.dataset.sort;
        if (headerMap[sortKey]) {
            th.textContent = t(headerMap[sortKey]);
        }
    });

    // Users filter placeholders and options
    var searchInput = document.getElementById("filter-search");
    if (searchInput) searchInput.placeholder = t("searchPlaceholder");

    // Server filter - update first option
    var serverFilter = document.getElementById("filter-server");
    if (serverFilter && serverFilter.options.length > 0) {
        serverFilter.options[0].textContent = t("allServers");
    }

    // Date filter options
    app.applyDateFilterLanguage("filter-latest");
    app.applyDateFilterLanguage("filter-oldest");

    // Type filter options
    var typeFilter = document.getElementById("filter-type");
    if (typeFilter) {
        for (var i = 0; i < typeFilter.options.length; i++) {
            var opt = typeFilter.options[i];
            if (opt.value === "") opt.textContent = t("all");
            else if (opt.value === "standard") opt.textContent = t("standard");
            else if (opt.value === "service") opt.textContent = t("service");
            else if (opt.value === "operator") opt.textContent = t("operator");
        }
    }

    // Servers table headers
    var serverHeaderMap = {
        name: "name",
        port: "connection",
        licensedSlots: "licensedSlots",
        usedSlots: "usedSlots",
        utilization: "utilization",
        totalAccounts: "accounts",
        status: "status",
    };
    document.querySelectorAll("#servers-table thead .sortable").forEach(function (th) {
        var sortKey = th.dataset.sort;
        if (serverHeaderMap[sortKey]) {
            th.textContent = t(serverHeaderMap[sortKey]);
        }
    });

    // Config view static labels
    var configHeading = document.querySelector("#view-config h2");
    if (configHeading) configHeading.textContent = t("dashboardConfig");

    var configLicensedLabel = document.querySelector("#view-config .filter-label");
    if (configLicensedLabel) configLicensedLabel.textContent = t("licensedUniqueUsers");

    var configLicensedDesc = document.querySelector("#view-config .text-xs.text-gray-500");
    if (configLicensedDesc) configLicensedDesc.textContent = t("licensedDesc");

    var configServersHeading = document.querySelector("#view-config h3");
    if (configServersHeading) configServersHeading.textContent = t("serversHeading");

    // Config table headers
    var configThs = document.querySelectorAll("#view-config .data-table thead th");
    if (configThs.length >= 4) {
        configThs[0].textContent = t("name");
        configThs[1].textContent = t("portLabel");
        configThs[2].textContent = t("user");
        configThs[3].textContent = t("actions");
    }

    // Config buttons
    var addServerBtn = document.querySelector('#view-config .btn-secondary[onclick="app.configAddServer()"]');
    if (addServerBtn) addServerBtn.textContent = t("addServer");
    var saveConfigBtn = document.querySelector('#view-config .btn-primary[onclick="app.configSave()"]');
    if (saveConfigBtn) saveConfigBtn.textContent = t("saveConfig");

    // Edit modal static labels
    var editTitle = document.querySelector("#edit-overlay h3");
    if (editTitle) editTitle.textContent = t("editUser");
    var editLoadingDiv = document.getElementById("edit-loading");
    if (editLoadingDiv) editLoadingDiv.textContent = t("loadingDetails");

    var editLabels = document.querySelectorAll("#edit-form .filter-label");
    if (editLabels.length >= 2) {
        editLabels[0].textContent = t("fullName");
        editLabels[1].textContent = t("email");
    }

    var pwLabel = document.querySelector("#edit-password-section .filter-label");
    if (pwLabel) pwLabel.textContent = t("passwordReset");

    var pwDesc = document.querySelector("#edit-password-section .text-xs.text-gray-500");
    if (pwDesc) pwDesc.textContent = t("passwordDesc");

    var pwResultLabel = document.querySelector("#edit-password-result .text-xs.text-gray-400");
    if (pwResultLabel) pwResultLabel.textContent = t("tempPassword");

    var editSaveBtn = document.getElementById("edit-save-btn");
    if (editSaveBtn) editSaveBtn.textContent = t("saveChanges");

    // Cancel buttons in modals
    document.querySelectorAll("#edit-overlay .btn-secondary").forEach(function (btn) {
        if (btn.getAttribute("onclick") === "app.editClose()") {
            btn.textContent = t("cancel");
        }
    });
    document.querySelectorAll("#modal-overlay .btn-secondary").forEach(function (btn) {
        if (btn.getAttribute("onclick") === "app.modalClose()") {
            btn.textContent = t("cancel");
        }
    });

    // Delete modal confirm button
    var modalConfirmBtn = document.getElementById("modal-confirm");
    if (modalConfirmBtn) modalConfirmBtn.textContent = t("delete");
};

app.applyDateFilterLanguage = function (selectId) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    for (var i = 0; i < sel.options.length; i++) {
        var opt = sel.options[i];
        if (opt.value === "") opt.textContent = t("any");
    }
    var optgroups = sel.querySelectorAll("optgroup");
    for (var g = 0; g < optgroups.length; g++) {
        var og = optgroups[g];
        // Determine if this is "Newer than" or "Older than" by checking first option value
        var firstOpt = og.querySelector("option");
        if (firstOpt && firstOpt.value.startsWith("lt")) {
            og.label = t("newerThan");
        } else {
            og.label = t("olderThan");
        }
        // Update option text
        var opts = og.querySelectorAll("option");
        for (var oi = 0; oi < opts.length; oi++) {
            var o = opts[oi];
            var valMap = {
                lt7: "lt7days", lt30: "lt30days", lt90: "lt90days",
                gt30: "gt30days", gt60: "gt60days", gt90: "gt90days",
                gt180: "gt180days", gt365: "gt365days",
            };
            if (valMap[o.value]) o.textContent = t(valMap[o.value]);
        }
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
        allOpt.textContent = t("allServers");
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
        t("showingOf")(rows.length, app.processedUsers.length);
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
    var headers = [t("username"), t("fullName"), t("server"), t("lastAccess"), t("updated"), t("type"), t("actions")];
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
        editBtn.textContent = t("edit");
        editBtn.onclick = (function (server, username, fullName, email) {
            return function (e) {
                e.stopPropagation();
                app.editUser(server, username, fullName, email);
            };
        })(acct.server, acct.username, acct.fullName, acct.email || row.email);
        actionsTd.appendChild(editBtn);

        var deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-danger btn-sm";
        deleteBtn.textContent = t("delete");
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
            btn.textContent = t("resetAgain");
        } else {
            app.showError("Password reset failed: " + (result.error || "Unknown error"));
            btn.textContent = t("generateReset");
        }
    } catch (err) {
        app.showError("Password reset failed: " + err.message);
        btn.textContent = t("generateReset");
    } finally {
        btn.disabled = false;
    }
};

app.editClose = function () {
    document.getElementById("edit-overlay").classList.add("hidden");
    app._editContext = null;
};

app.confirmDeleteUser = function (server, username) {
    document.getElementById("modal-title").textContent = t("deleteUser");
    document.getElementById("modal-body").textContent = t("deleteConfirm")(username, server);
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
        testBtn.textContent = t("test");
        testBtn.onclick = (function (idx, btn) {
            return function () { app.configTestServer(idx, btn); };
        })(i, testBtn);
        tdActions.appendChild(testBtn);

        var removeBtn = document.createElement("button");
        removeBtn.className = "btn-danger btn-sm";
        removeBtn.textContent = t("remove");
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
    btn.textContent = t("testing");

    try {
        var res = await fetch(
            "/api/servers/" + encodeURIComponent(name) + "/test",
            { method: "POST" }
        );
        var result = await res.json();
        var labels = {
            "connected": t("connected"),
            "trust_failed": t("trustFailed"),
            "auth_failed": t("authFailed"),
            "permission_denied": t("noPermission"),
            "error": t("error"),
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
        btn.textContent = t("error");
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
            statusEl.textContent = t("configSaved");
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
