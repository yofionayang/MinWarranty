// get calculator elements
const purchaseDateInput = document.getElementById("purchaseDate");
const warrantyDurationInput = document.getElementById("warrantyDuration");
const calculateButton = document.getElementById("calculateWarranty");

const warrantyResult = document.getElementById("warrantyResult");
const expirationDateElement = document.getElementById("expirationDate");
const remainingWarrantyElement = document.getElementById("remainingWarranty");

// set today's date as the default purchase date
const today = new Date();
const localToday = new Date(
    today.getTime() - today.getTimezoneOffset() * 60000
).toISOString().split("T")[0];

purchaseDateInput.max = localToday;
purchaseDateInput.value = localToday;

// calculate warranty expiration
calculateButton.addEventListener("click", function(){

    const purchaseDateValue = purchaseDateInput.value;
    const duration = Number(warrantyDurationInput.value);

    // validate purchase date
    if (!purchaseDateValue){
        alert("Please select a purchase date.");
        return;
    }

    //parse date using local calender values
    const [year,month,day] = purchaseDateValue.split("-").map(Number);
    const purchaseDate = new Date(year, month-1,day);

    if (purchaseDate > new Date(today.getFullYear(), today.getMonth(), today.getDate())){
        alert("Purchase date cannot be in the future.")
        return;
    }

    // calculate expiration date
    const expirationDate = new Date(purchaseDate);
    expirationDate.setDate(1)
    expirationDate.setMonth(expirationDate.getMonth() + duration);

    // handle months with fewer days
    const lastDay = new Date(
        expirationDate.getFullYear(),
        expirationDate.getMonth() + 1,
        0
    ).getDate();

    expirationDate.setDate(Math.min(day, lastDay));

    // calculate remaining days
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const remainingTime = expirationDate - currentDate;
    const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

    // format expiration date
    expirationDateElement.textContent = 
        expirationDate.toLocaleDateString("en-CA", {
            year: "numeric",
            month: "long",
            day:"numeric"
        });

    // display remaining warranty
    if (remainingDays > 0){
        const years = Math.floor(remainingDays / 365);
        const months = Math.floor((remainingDays%365)/30);
        const days = remainingDays % 30;

        let remainingText = "";

        if(years > 0) remainingText += years + " year(s) ";
        if(months > 0) remainingText += months + " month(s) ";
        if(days>0 || remainingText == "") remainingText += days + " day(s)";
        
        remainingWarrantyElement.textContent =
            remainingText + " of warranty coverage remaining.";
    }else{
        remainingWarrantyElement.textContent =
            "This warranty has expired.";
    }

    //show results
    warrantyResult.hidden = false;
});