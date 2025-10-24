const filterByDistricts = (heritagePlaces) => {
    const grouped = {};

    heritagePlaces.forEach((place) => {
        const district = place.district;
        if (!grouped[district]) {
            grouped[district] = [];
        }
        grouped[district].push(place);
    });

    return grouped;
}

export default filterByDistricts;
