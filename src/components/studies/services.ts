import { createStudy, deleteStudy, getStudyFileUrl, updateStudy } from "@/app/(app)/pacientes/[id]/estudios/actions";
import type {
  CreateStudyAction,
  DeleteStudyAction,
  StudyFileUrlAction,
  UpdateStudyAction,
} from "@/components/studies/schema";
import { removeUploadedFile, uploadStudyFile, type RemoveFn, type UploadFn } from "@/components/studies/upload";

/** Operaciones que usa la pestaña de estudios (inyectables para vistas previas). */
export type StudyServices = {
  upload: UploadFn;
  remove: RemoveFn;
  createStudy: CreateStudyAction;
  updateStudy: UpdateStudyAction;
  deleteStudy: DeleteStudyAction;
  getFileUrl: StudyFileUrlAction;
};

export const defaultStudyServices: StudyServices = {
  upload: uploadStudyFile,
  remove: removeUploadedFile,
  createStudy,
  updateStudy,
  deleteStudy,
  getFileUrl: getStudyFileUrl,
};
