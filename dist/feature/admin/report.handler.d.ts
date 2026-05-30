import type { ReportNamespace, ReportSocket } from "./type";
import type { NotificationNamespace } from "../notification/type";
export declare function registerReportHandler(nsp: ReportNamespace, notificationNsp: NotificationNamespace, socket: ReportSocket): void;
