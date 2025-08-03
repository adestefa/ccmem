-- Claude Code Memory (CCMem) - Standardized Project Memory Schema
-- Each project gets its own .claude/db/ccmem.sqlite with these tables

-- Project settings and configuration knowledge
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL, -- 'start', 'test', 'build', 'deploy', 'env', 'config'
    key_name TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, key_name)
);

-- Architecture and system design knowledge
CREATE TABLE IF NOT EXISTS architecture (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component TEXT NOT NULL,
    description TEXT NOT NULL,
    tech_stack TEXT NOT NULL, -- comma-separated technologies
    file_paths TEXT NULL, -- comma-separated file paths
    patterns TEXT NULL, -- design patterns used
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployment and infrastructure knowledge
CREATE TABLE IF NOT EXISTS deployment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    environment TEXT NOT NULL, -- dev, staging, production
    target_host TEXT NULL,
    deployment_steps TEXT NOT NULL,
    test_verification TEXT NULL,
    rollback_steps TEXT NULL,
    last_deployed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User stories and features (instead of GitHub PRs)
CREATE TABLE IF NOT EXISTS story (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- active, completed, cancelled
    priority INTEGER DEFAULT 3, -- 1=critical, 5=low
    files_affected TEXT NULL, -- comma-separated file paths
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);

-- Development tasks linked to stories
CREATE TABLE IF NOT EXISTS task (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'todo', -- todo, in_progress, completed
    files_affected TEXT NULL,
    implementation_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (story_id) REFERENCES story(id)
);

-- Bugs and issues
CREATE TABLE IF NOT EXISTS defect (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id INTEGER NULL,
    task_id INTEGER NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'medium', -- critical, high, medium, low
    status TEXT DEFAULT 'open', -- open, in_progress, resolved
    files_affected TEXT NULL,
    fix_description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (story_id) REFERENCES story(id),
    FOREIGN KEY (task_id) REFERENCES task(id)
);

-- Lessons learned and project knowledge
CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'architecture', 'performance', 'security', 'process'
    impact_level TEXT DEFAULT 'medium', -- critical, high, medium, low
    related_files TEXT NULL,
    tags TEXT NULL, -- comma-separated
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- General project knowledge and notes
CREATE TABLE IF NOT EXISTS knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general', -- 'general', 'process', 'reference', 'reminder'
    tags TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quick status view for Claude
CREATE VIEW IF NOT EXISTS project_status AS
SELECT 
    (SELECT COUNT(*) FROM story WHERE status = 'active') as active_stories,
    (SELECT COUNT(*) FROM task WHERE status IN ('todo', 'in_progress')) as pending_tasks,
    (SELECT COUNT(*) FROM defect WHERE status = 'open') as open_defects,
    (SELECT COUNT(*) FROM lessons) as lessons_count,
    (SELECT value FROM settings WHERE category = 'start' AND key_name = 'command' LIMIT 1) as start_command,
    (SELECT value FROM settings WHERE category = 'test' AND key_name = 'command' LIMIT 1) as test_command;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
CREATE INDEX IF NOT EXISTS idx_story_status ON story(status);
CREATE INDEX IF NOT EXISTS idx_task_status ON task(status);
CREATE INDEX IF NOT EXISTS idx_defect_status ON defect(status);
CREATE INDEX IF NOT EXISTS idx_lessons_category ON lessons(category);

-- Update triggers
CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
    AFTER UPDATE ON settings
    BEGIN
        UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_story_timestamp 
    AFTER UPDATE ON story
    BEGIN
        UPDATE story SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_task_timestamp 
    AFTER UPDATE ON task
    BEGIN
        UPDATE task SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;