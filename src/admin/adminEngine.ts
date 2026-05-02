import { queryClient } from '../main';

// A classe AdminEngine centraliza o estado de escrita e invalidação
export const AdminEngine = {
  isMutating: false,

  async safeMutation({
    mutationFn,
    onSuccess,
    onError,
    invalidateKeys = []
  }: any) {
    if (this.isMutating) return;

    this.isMutating = true;

    try {
      const result = await mutationFn();

      // Invalidação global controlada
      invalidateKeys.forEach((key: any) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      onSuccess?.(result);

      return result;

    } catch (error) {
      onError?.(error);
      throw error;

    } finally {
      this.isMutating = false;
    }
  }
};
