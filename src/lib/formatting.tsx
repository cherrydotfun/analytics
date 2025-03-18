const abbreviateNumber = (value: number) => {
    if (value < 1000) {
        return value.toString();
    }
  
    const suffixes = ["", "K", "M", "B", "T"];
    const suffixNum = Math.floor(Math.log10(value) / 3);
    const shortValue = (value / Math.pow(1000, suffixNum)).toFixed(1);
    const intValue = parseFloat(shortValue);
  
    // Ensure the value is rounded correctly and does not show decimals unnecessarily
    const formattedValue = intValue % 1 === 0 ? intValue.toFixed(0) : intValue.toFixed(1);
  
    return formattedValue + suffixes[suffixNum];
};

const formatGainLoss = ( val: number, isAbs: boolean = true ) => {
    if(val){
        if(isAbs){
        return val>=0 ? '▲ $' + val?.toFixed(2) : '▼ $' + (val * -1)?.toFixed(2)
        }
        else{
        return val>=0 ? '▲ ' + val?.toFixed(2) + '%' : '▼ ' + (val * -1)?.toFixed(2) + '%'
        }
    }
    return 'N/A';
}

export { abbreviateNumber, formatGainLoss };