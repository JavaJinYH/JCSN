/**
 * 安装费相关计算
 */

interface ServiceAppointment {
  installationFee?: number;
  status: string;
}

interface InstallationFeeStats {
  totalFees: number;
  completedFees: number;
  pendingFees: number;
}

/**
 * 计算安装费统计
 */
export function calculateInstallationFeeStats(appointments: ServiceAppointment[]): InstallationFeeStats {
  let totalFees = 0;
  let completedFees = 0;
  let pendingFees = 0;

  appointments.forEach(appt => {
    const fee = appt.installationFee || 0;
    totalFees += fee;
    if (appt.status === '已完成') {
      completedFees += fee;
    } else {
      pendingFees += fee;
    }
  });

  return {
    totalFees,
    completedFees,
    pendingFees,
  };
}
