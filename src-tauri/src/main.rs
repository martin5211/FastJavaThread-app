#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::State;

struct McpProcess(Mutex<Option<Child>>);

/// Try to find `node` on the system PATH using `where` (Windows) or `which` (Unix).
fn detect_node() -> Option<String> {
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let cmd = if cfg!(windows) { "where" } else { "which" };
        let result = Command::new(cmd).arg("node").output().ok().and_then(|output| {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let path = stdout.lines().next()?.trim().to_string();
                if !path.is_empty() { Some(path) } else { None }
            } else {
                None
            }
        });
        let _ = tx.send(result);
    });
    rx.recv_timeout(Duration::from_secs(5)).ok().flatten()
}

#[tauri::command]
fn detect_node_path() -> Result<String, String> {
    detect_node().ok_or_else(|| "Node.js not found in PATH".into())
}

#[tauri::command]
fn start_mcp(
    state: State<McpProcess>,
    port: u16,
    auth_token: String,
    mcp_script: String,
    node_path: String,
) -> Result<u32, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut child) = *guard {
        if child.try_wait().map_err(|e| e.to_string())?.is_none() {
            return Err("MCP server already running".into());
        }
    }

    let node = if node_path.is_empty() {
        detect_node().ok_or("Node.js not found in PATH. Set the path manually in Settings.")?
    } else if PathBuf::from(&node_path).exists() {
        node_path
    } else {
        return Err(format!("Node.js not found at: {}", node_path));
    };

    let mut cmd = Command::new(&node);
    cmd.arg(&mcp_script)
        .arg("--transport").arg("http")
        .arg("--port").arg(port.to_string());

    if !auth_token.is_empty() {
        cmd.arg("--auth-token").arg(&auth_token);
    }

    let child = cmd.spawn().map_err(|e| {
        format!("Failed to start node ({}): {}", node, e)
    })?;
    let pid = child.id();
    *guard = Some(child);
    Ok(pid)
}

#[tauri::command]
fn stop_mcp(state: State<McpProcess>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut child) = *guard {
        child.kill().map_err(|e| e.to_string())?;
        child.wait().ok();
    }
    *guard = None;
    Ok(())
}

#[tauri::command]
fn mcp_running(state: State<McpProcess>) -> Result<bool, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut child) = *guard {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(_) => {
                *guard = None;
                Ok(false)
            }
            None => Ok(true),
        }
    } else {
        Ok(false)
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(McpProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            start_mcp, stop_mcp, mcp_running, detect_node_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
