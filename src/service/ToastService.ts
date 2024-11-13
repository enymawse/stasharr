import { Toast } from "bootstrap";
import { Styles } from "../enums/Styles";

export default class ToastService {
  public static showToast(
    message: string,
    isSuccess: boolean = true,
    duration: number = 5000,
  ): void {
    const toastContainer = document.querySelector(".ToastContainer");
    if (toastContainer) {
      toastContainer.classList.add("toast-container");
      const customToast = document.createElement("div");
      customToast.classList.add(
        "toast",
        isSuccess ? "text-bg-success" : "text-bg-danger",
        "align-items-center",
        "border-0",
      );
      customToast.role = "alert";
      customToast.ariaLive = "assertive";
      customToast.ariaAtomic = "true";

      const dflex = document.createElement("div");
      dflex.classList.add("d-flex");

      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.classList.add(
        "btn-close",
        "btn-close-white",
        "me-2",
        "m-auto",
      );
      closeButton.setAttribute("data-bs-dismiss", "toast");
      closeButton.ariaLabel = "Close";

      const body = document.createElement("div");
      body.classList.add("toast-body");
      body.innerText = message;

      dflex.appendChild(body);
      dflex.appendChild(closeButton);
      customToast.appendChild(dflex);

      toastContainer.appendChild(customToast);
      customToast.addEventListener("hidden.bs.toast", () => {
        console.log("hidden.bs.toast fired");
        customToast.remove();
      });
      const toast = new Toast(customToast);
      toast.show();
    } else {
      console.log("ToastContainer not found.");
    }
  }
}
