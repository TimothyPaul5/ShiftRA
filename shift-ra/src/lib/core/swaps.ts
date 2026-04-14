import { getAssignmentById, updateAssignment } from "@/lib/data/scheduleRepository";
import {
  createSwapRequest,
  getSwapRequestById,
  updateSwapRequestStatus,
} from "@/lib/data/swapRepository";
import { getProfileById } from "@/lib/data/profileRepository";

export async function requestSwap(params: {
  requester_ra_id: string;
  target_ra_id: string;
  requester_assignment_id: number;
  target_assignment_id: number;
}) {
  const {
    requester_ra_id,
    target_ra_id,
    requester_assignment_id,
    target_assignment_id,
  } = params;

  const [requesterAssignment, targetAssignment, requester, target] = await Promise.all([
    getAssignmentById(requester_assignment_id),
    getAssignmentById(target_assignment_id),
    getProfileById(requester_ra_id),
    getProfileById(target_ra_id),
  ]);

  if (!requesterAssignment || !targetAssignment) {
    throw new Error("One or both assignments were not found.");
  }

  if (!requester || !target) {
    throw new Error("One or both RAs were not found.");
  }

  if (requesterAssignment.residence_hall_id !== targetAssignment.residence_hall_id) {
    throw new Error("Swaps are only allowed within the same residence hall.");
  }

  if (requesterAssignment.role !== targetAssignment.role) {
    throw new Error("Swaps are only allowed between the same role type.");
  }

  if (requesterAssignment.assigned_ra_id !== requester_ra_id) {
    throw new Error("Requester does not own the offered shift.");
  }

  if (targetAssignment.assigned_ra_id !== target_ra_id) {
    throw new Error("Target RA does not own the requested shift.");
  }

  return await createSwapRequest({
    requester_ra_id,
    target_ra_id,
    requester_assignment_id,
    target_assignment_id,
    residence_hall_id: requesterAssignment.residence_hall_id,
  });
}

export async function approveSwap(swapRequestId: number, actingRAId: string) {
  const swap = await getSwapRequestById(swapRequestId);
  if (!swap) throw new Error("Swap request not found.");

  if (swap.target_ra_id !== actingRAId) {
    throw new Error("Only the target RA can approve this swap.");
  }

  const [requesterAssignment, targetAssignment] = await Promise.all([
    getAssignmentById(swap.requester_assignment_id),
    getAssignmentById(swap.target_assignment_id),
  ]);

  if (!requesterAssignment || !targetAssignment) {
    await updateSwapRequestStatus(swap.id, "failed");
    throw new Error("One or both assignments no longer exist.");
  }

  await updateAssignment(requesterAssignment.id!, { assigned_ra_id: swap.target_ra_id });
  await updateAssignment(targetAssignment.id!, { assigned_ra_id: swap.requester_ra_id });
  return await updateSwapRequestStatus(swap.id, "approved");
}

export async function rejectSwap(swapRequestId: number, actingRAId: string) {
  const swap = await getSwapRequestById(swapRequestId);
  if (!swap) throw new Error("Swap request not found.");

  if (swap.target_ra_id !== actingRAId) {
    throw new Error("Only the target RA can reject this swap.");
  }

  return await updateSwapRequestStatus(swap.id, "rejected");
}