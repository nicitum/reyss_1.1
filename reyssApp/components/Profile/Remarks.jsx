import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator
} from "react-native";
import axios from "axios";
import { ipAddress } from "../../urls"; // Assuming you have this for IP address

const Remarks = () => {
    const [remarksData, setRemarksData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRemarks = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`http://${ipAddress}:8090/fetch-remarks`);
                if (response.status === 200) {
                    setRemarksData(response.data.remarks);
                } else {
                    setError(`Failed to fetch remarks: Server responded with status ${response.status}`);
                }
            } catch (err) {
                setError("Error fetching remarks. Please check your network.");
                console.error("Error fetching remarks:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRemarks();
    }, []);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
            <View style={styles.container}>
                <Text style={styles.headerText}>Remarks List</Text>
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableRowHeader}>
                        <Text style={[styles.tableHeaderCell, styles.headerCell]}>Customer ID</Text>
                        <Text style={[styles.tableHeaderCell, styles.headerCell]}>Order ID</Text>
                        <Text style={[styles.tableHeaderCell, styles.headerCell, styles.remarksHeaderCell]}>Remarks</Text>
                    </View>

                    {/* Table Body */}
                    {remarksData.map((remark, index) => (
                        <View style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]} key={remark.id}>
                            <Text style={styles.tableCell}>{remark.customer_id}</Text>
                            <Text style={styles.tableCell}>{remark.order_id}</Text>
                            <Text style={[styles.tableCell, styles.remarksCell]}>{remark.remarks}</Text>
                        </View>
                    ))}
                </View>

                {remarksData.length === 0 && !loading && !error && (
                    <Text style={styles.emptyText}>No remarks found.</Text>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingVertical: 24,
    },
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 24,
        color: '#1a1a1a',
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#dc3545',
        textAlign: 'center',
        padding: 16,
    },
    table: {
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tableRowHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        paddingVertical: 16,
        borderBottomWidth: 2,
        borderBottomColor: '#e9ecef',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    evenRow: {
        backgroundColor: '#FFFFFF',
    },
    oddRow: {
        backgroundColor: '#f8f9fa',
    },
    tableHeaderCell: {
        flex: 1,
        fontWeight: '700',
        fontSize: 15,
        color: '#495057',
        paddingHorizontal: 12,
    },
    headerCell: {
        textTransform: 'uppercase',
    },
    remarksHeaderCell: {
        flex: 2,
    },
    tableCell: {
        flex: 1,
        fontSize: 14,
        color: '#212529',
        paddingHorizontal: 12,
        lineHeight: 20,
    },
    remarksCell: {
        flex: 2,
    },
    emptyText: {
        fontSize: 16,
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 24,
        fontStyle: 'italic',
    },
});

export default Remarks;