import { listCommands, getPlugin } from "@utils/pluginManager";
import { Plugin } from "@utils/pluginBase";
import fs from "fs";
import path from "path";

function readVersion(): string {
  try {
    const packagePath = path.join(process.cwd(), "package.json");
    const packageJson = fs.readFileSync(packagePath, "utf-8");
    const packageData = JSON.parse(packageJson);
    return packageData.version || "未知版本";
  } catch (error) {
    console.error('Failed to read version:', error);
    return "未知版本";
  }
}

function formatCommandList(commands: string[]): string {
  const sortedCommands = commands.sort((a, b) => a.localeCompare(b));
  
  // 分析插件，找出多子指令插件
  const pluginGroups = new Map<string, string[]>();
  const singleCommands: string[] = [];
  
  sortedCommands.forEach(cmd => {
    const plugin = getPlugin(cmd);
    if (plugin && Array.isArray(plugin.command) && plugin.command.length > 1) {
      const mainCommand = plugin.command[0];
      if (!pluginGroups.has(mainCommand)) {
        pluginGroups.set(mainCommand, plugin.command);
      }
    } else {
      singleCommands.push(cmd);
    }
  });
  
  const result: string[] = [];
  
  // 添加单个命令
  if (singleCommands.length > 0) {
    result.push(singleCommands.map(cmd => `<code>${cmd}</code>`).join(', '));
  }
  
  // 添加多子指令插件组
  for (const [mainCommand, subCommands] of pluginGroups) {
    const formattedSubs = subCommands.map(cmd => `<code>${cmd}</code>`).join(', ');
    result.push(`<b>${mainCommand}:</b> ${formattedSubs}`);
  }
  
  return result.join('\n\n');
}

function htmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const helpPlugin: Plugin = {
  command: ["h", "help", "?"],
  description: "查看帮助信息和可用命令列表",
  cmdHandler: async (msg) => {
    try {
      const args = msg.text.split(' ').slice(1);
      
      if (args.length === 0) {
        // 显示所有命令列表
        const commands = listCommands();
        const version = readVersion();
        const totalCommands = commands.length;
        
        const helpText = [
          `🤖 <b>Telebox v${htmlEscape(version)}</b> | ${totalCommands}个命令`,
          "",
          formatCommandList(commands),
          "",
          "💡 <b>使用说明:</b>",
          "• 使用 <code>.help &lt;命令&gt;</code> 查看具体帮助",
          "• 命令前缀使用 <code>.</code>",
          "• 部分命令支持多个别名",
          "",
          "🔍 <b>示例:</b>",
          "• <code>.help sendlog</code> - 查看日志发送帮助"
        ].join('\n');
        
        await msg.edit({ text: helpText, parseMode: "html" });
        return;
      }
      
      // 显示特定命令的帮助
      const command = args[0].toLowerCase();
      const plugin = getPlugin(command);
      
      if (!plugin) {
        await msg.edit({
          text: `❌ 未找到命令 <code>${htmlEscape(command)}</code>\n\n使用 <code>.help</code> 查看所有命令`,
          parseMode: "html"
        });
        return;
      }
      
      // 格式化命令别名
      const aliases = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
      const aliasText = aliases.map(alias => `<code>.${alias}</code>`).join(', ');
      
      const commandHelpText = [
        `🔧 <b>${htmlEscape(command)}</b>`,
        `${htmlEscape(plugin.description || '无描述')}`,
        "",
        `别名: ${aliasText}`,
        `用法: <code>.${command}</code>`
      ].join('\n');
      
      await msg.edit({ text: commandHelpText, parseMode: "html" });
      
    } catch (error: any) {
      console.error('Help plugin error:', error);
      const errorMsg = error.message?.length > 100 ? error.message.substring(0, 100) + '...' : error.message;
      await msg.edit({
        text: [
          "❌ <b>帮助系统错误</b>",
          "",
          `<b>错误信息:</b> <code>${htmlEscape(errorMsg || '未知错误')}</code>`,
          "",
          "🔄 请稍后重试或联系管理员"
        ].join('\n'),
        parseMode: "html"
      });
    }
  },
};

export default helpPlugin;
