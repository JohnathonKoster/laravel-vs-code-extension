import * as vscode from "vscode";
import { getWorkspaceFolders, hasWorkspace } from "./project";
import { leadingDebounce } from "./util";

type FileEvent = "change" | "create" | "delete";

let watchers: vscode.FileSystemWatcher[] = [];

export type WatcherPattern =
    | string
    | string[]
    | (() => Promise<string | string[] | null>);

export const defaultFileEvents: FileEvent[] = ["change", "create", "delete"];

export const loadAndWatch = (
    load: () => void,
    patterns: WatcherPattern,
    events: FileEvent[] = defaultFileEvents,
): void => {
    if (!hasWorkspace()) {
        return;
    }

    load();

    const debounceTime = 1000;

    if (patterns instanceof Function) {
        patterns().then((result) => {
            if (result !== null) {
                createFileWatcher(
                    result,
                    leadingDebounce(load, debounceTime),
                    events,
                );
            }
        });

        return;
    }

    createFileWatcher(patterns, leadingDebounce(load, debounceTime), events);
};

export const createFileWatcher = (
    patterns: string | string[],
    callback: (e: vscode.Uri) => void,
    events: FileEvent[] = defaultFileEvents,
): vscode.FileSystemWatcher[] => {
    if (!hasWorkspace()) {
        return [];
    }

    patterns = typeof patterns === "string" ? [patterns] : patterns;

    return patterns.map((pattern) => {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(getWorkspaceFolders()[0], pattern),
            !events.includes("create"),
            !events.includes("change"),
            !events.includes("delete"),
        );

        if (events.includes("change")) {
            watcher.onDidChange(callback);
        }

        if (events.includes("create")) {
            watcher.onDidCreate(callback);
        }

        if (events.includes("delete")) {
            watcher.onDidDelete(callback);
        }

        registerWatcher(watcher);

        return watcher;
    });
};

export const registerWatcher = (watcher: vscode.FileSystemWatcher) => {
    watchers.push(watcher);
};

export const disposeWatchers = () => {
    watchers.forEach((watcher) => watcher.dispose());
    watchers = [];
};
