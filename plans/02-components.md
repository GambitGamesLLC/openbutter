# Component Specifications

## butter-sidebar

**Purpose:** Orchestrator list and navigation

**HTML Structure:**
```html
<butter-sidebar>
  <nav class="orchestrator-list"></nav>
  <footer class="sidebar-footer">
    <button class="new-orchestrator">+ New</button>
  </footer>
</butter-sidebar>
```

**Attributes:** `active-id`, `collapsed`

**Events:** `orchestrator-select`, `orchestrator-create`

---

## butter-chat

**Purpose:** Main chat interface container

**HTML Structure:**
```html
<butter-chat>
  <header class="chat-header"></header>
  <div class="messages-container"></div>
  <butter-input class="chat-input"></butter-input>
</butter-chat>
```

**Attributes:** `orchestrator-id`, `loading`

**Events:** `message-send`, `typing-start`

---

## butter-message

**Purpose:** Individual message bubble

**HTML Structure:**
```html
<butter-message>
  <avatar class="sender-avatar"></avatar>
  <div class="message-content">
    <span class="sender-name"></span>
    <div class="message-body"></div>
    <time class="timestamp"></time>
  </div>
</butter-message>
```

**Attributes:** `sender`, `timestamp`, `type` (user/ai/system)

**Events:** `reply`, `copy`, `delete`

---

## butter-settings

**Purpose:** Settings panel

**HTML Structure:**
```html
<butter-settings>
  <section class="settings-group">
    <h3>Appearance</h3>
    <label>Theme</label>
  </section>
  <section class="settings-group">
    <h3>Notifications</h3>
  </section>
</butter-settings>
```

**Attributes:** `active-section`, `unsaved-changes`

**Events:** `setting-change`, `save`, `reset`
