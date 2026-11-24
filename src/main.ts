// 顺序：先宿主样式（声明层顺序），再挂载工作台（注册 window.SAWorkbench），最后运行宿主外壳。
import './host/host.css';
import './workbench/mount';
import './host/host.js';
