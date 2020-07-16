import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { app } from "electron";
import { sync } from "read-chunk";

import { concatUint8Arrays } from "@server/helpers/utils";
import { getAppleScripts } from "./scripts";

let subdir = "";
if (process.env.NODE_ENV !== "production") subdir = "bluebubbles-server";

/**
 * The class used to handle all communications to the App's "filesystem".
 * The filesystem is the directory dedicated to the app-specific files
 */
export class FileSystem {
    public static baseDir = path.join(app.getPath("userData"), subdir);

    public static attachmentsDir = path.join(FileSystem.baseDir, "Attachments");

    public static contactsDir = path.join(FileSystem.baseDir, "Contacts");

    public static scriptDir = path.join(FileSystem.baseDir, "Scripts");

    public static fcmDir = path.join(FileSystem.baseDir, "FCM");

    /**
     * Sets up all required directories and then, writes the scripts
     * to the scripts directory
     */
    static async setup(): Promise<void> {
        FileSystem.setupDirectories();
        FileSystem.setupScripts();
    }

    /**
     * Creates required directories
     */
    static setupDirectories(): void {
        if (!fs.existsSync(FileSystem.baseDir)) fs.mkdirSync(FileSystem.baseDir);
        if (!fs.existsSync(FileSystem.scriptDir)) fs.mkdirSync(FileSystem.scriptDir);
        if (!fs.existsSync(FileSystem.attachmentsDir)) fs.mkdirSync(FileSystem.attachmentsDir);
        if (!fs.existsSync(FileSystem.contactsDir)) fs.mkdirSync(FileSystem.contactsDir);
        if (!fs.existsSync(FileSystem.fcmDir)) fs.mkdirSync(FileSystem.fcmDir);
    }

    /**
     * Creates required scripts
     */
    static setupScripts(): void {
        getAppleScripts().forEach(script => {
            // Remove each script, and re-write it (in case of update)
            const scriptPath = `${FileSystem.scriptDir}/${script.name}`;
            if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
            fs.writeFileSync(scriptPath, script.contents);
        });
    }

    /**
     * Saves an attachment
     *
     * @param name Name for the attachment
     * @param buffer The attachment bytes (buffer)
     */
    static saveAttachment(name: string, buffer: Uint8Array): void {
        fs.writeFileSync(path.join(FileSystem.attachmentsDir, name), buffer);
    }

    /**
     * Saves an attachment by chunk
     *
     * @param guid Unique identifier for the attachment
     * @param chunkNumber The index of the chunk (for ordering/reassembling)
     * @param buffer The attachment chunk bytes (buffer)
     */
    static saveAttachmentChunk(guid: string, chunkNumber: number, buffer: Uint8Array): void {
        const parent = path.join(FileSystem.attachmentsDir, guid);
        if (!fs.existsSync(parent)) fs.mkdirSync(parent);
        fs.writeFileSync(path.join(parent, `${chunkNumber}.chunk`), buffer);
    }

    /**
     * Removes a chunk directory
     *
     * @param guid Unique identifier for the attachment
     */
    static deleteChunks(guid: string): void {
        const dir = path.join(FileSystem.attachmentsDir, guid);
        if (fs.existsSync(dir)) fs.rmdirSync(dir, { recursive: true });
    }

    /**
     * Builds an attachment by combining all chunks
     *
     * @param guid Unique identifier for the attachment
     */
    static buildAttachmentChunks(guid: string): Uint8Array {
        let chunks = new Uint8Array(0);

        // Get the files in ascending order
        const files = fs.readdirSync(path.join(FileSystem.attachmentsDir, guid));
        files.sort((a, b) => Number(a.split(".")[0]) - Number(b.split(".")[0]));

        // Read the files and append to chunks
        for (const file of files) {
            const fileData = fs.readFileSync(path.join(FileSystem.attachmentsDir, guid, file));
            chunks = concatUint8Arrays(chunks, Uint8Array.from(fileData));
        }

        return chunks;
    }

    /**
     * Saves the Client FCM JSON file
     *
     * @param contents The object data for the FCM client
     */
    static saveFCMClient(contents: any): void {
        fs.writeFileSync(path.join(FileSystem.fcmDir, "client.json"), JSON.stringify(contents));
    }

    /**
     * Saves the Server FCM JSON file
     *
     * @param contents The object data for the FCM server
     */
    static saveFCMServer(contents: any): void {
        fs.writeFileSync(path.join(FileSystem.fcmDir, "server.json"), JSON.stringify(contents));
    }

    /**
     * Gets the FCM client data
     *
     * @returns The parsed FCM client data
     */
    static getFCMClient(): any {
        const filePath = path.join(FileSystem.fcmDir, "client.json");
        if (!fs.existsSync(filePath)) return null;

        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    /**
     * Gets the FCM server data
     *
     * @returns The parsed FCM server data
     */
    static getFCMServer(): any {
        const filePath = path.join(FileSystem.fcmDir, "server.json");
        if (!fs.existsSync(filePath)) return null;

        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    /**
     * Deletes an attachment from the app's image cache
     *
     * @param name The name of the attachment to delete
     */
    static removeAttachment(name: string): void {
        try {
            fs.unlinkSync(path.join(FileSystem.attachmentsDir, name));
        } catch (e) {
            console.warn(`Failed to remove attachment: ${name}`);
        }
    }

    static readFileChunk(filePath: string, start: number, chunkSize = 1024): Uint8Array {
        // Get the file size
        const stats = fs.statSync(filePath);
        let fStart = start;

        // Make sure the start are not bigger than the size
        if (fStart > stats.size) fStart = stats.size;
        return Uint8Array.from(sync(filePath, fStart, chunkSize));
    }

    /**
     * Loops over all the files in the attachments directory,
     * then call the delete method
     */
    static purgeAttachments(): void {
        const files = fs.readdirSync(FileSystem.attachmentsDir);
        files.forEach(file => {
            FileSystem.removeAttachment(file);
        });
    }

    /**
     * Asynchronously executes a shell command
     */
    static async execShellCommand(cmd: string) {
        const { exec } = child_process;
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }

                resolve(stdout || stderr);
            });
        });
    }

    /**
     * Makes sure that Messages is running
     */
    static async startMessages() {
        await FileSystem.execShellCommand(`osascript "${FileSystem.scriptDir}/startMessages.scpt"`);
    }
}
