import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Animated, 
  ScrollView,
  Dimensions 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const App = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [isIncome, setIsIncome] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadData = async () => {
    try {
      const savedTransactions = await AsyncStorage.getItem('transactions');
      if (savedTransactions) {
        const parsedTransactions = JSON.parse(savedTransactions).map(t => ({
          ...t,
          date: isValidDate(t.date) ? t.date : new Date().toISOString()
        }));
        setTransactions(parsedTransactions);
        calculateBalance(parsedTransactions);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load data');
    }
  };

  const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const saveData = async (newTransactions) => {
    try {
      await AsyncStorage.setItem('transactions', JSON.stringify(newTransactions));
      calculateBalance(newTransactions);
    } catch (e) {
      Alert.alert('Error', 'Failed to save data');
    }
  };

  const calculateBalance = (transactions) => {
    const total = transactions.reduce((acc, curr) => {
      return curr.isIncome ? acc + curr.amount : acc - curr.amount;
    }, 0);
    setBalance(total);
  };

  const addTransaction = () => {
    if (!amount || !category) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!isIncome && balance - Number(amount) < 0) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    const newTransaction = {
      id: Date.now().toString(),
      amount: Number(amount),
      category,
      isIncome,
      date: new Date().toISOString(),
    };

    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);
    saveData(updatedTransactions);
    setAmount('');
    setCategory('');
  };

  const deleteTransaction = (id) => {
    Alert.alert(
      'Confirm',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          onPress: () => {
            const updatedTransactions = transactions.filter(t => t.id !== id);
            setTransactions(updatedTransactions);
            saveData(updatedTransactions);
          }
        }
      ]
    );
  };

  const deleteAllTransactions = () => {
    Alert.alert(
      'Confirm',
      'Are you sure you want to delete ALL transactions?',
      [
        { text: 'Cancel' },
        {
          text: 'Delete All',
          onPress: () => {
            setTransactions([]);
            saveData([]);
          }
        }
      ]
    );
  };

  const chartData = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const incomeData = Array(7).fill(0);
    const expenseData = Array(7).fill(0);

    transactions.forEach(transaction => {
      try {
        const transactionDate = new Date(transaction.date);
        if (isNaN(transactionDate.getTime())) return;
        
        const formattedDate = transactionDate.toISOString().split('T')[0];
        const dayIndex = days.indexOf(formattedDate);
        
        if (dayIndex !== -1) {
          if (transaction.isIncome) {
            incomeData[dayIndex] += transaction.amount;
          } else {
            expenseData[dayIndex] += transaction.amount;
          }
        }
      } catch (error) {
        console.error('Invalid transaction date:', transaction.date);
      }
    });

    return {
      labels: days.map(date => {
        try {
          const d = new Date(date);
          if (isNaN(d.getTime())) return '';
          return `${d.getDate()}/${d.getMonth() + 1}`;
        } catch {
          return '';
        }
      }),
      datasets: [
        {
          data: incomeData,
          color: (opacity = 1) => `rgba(0, 255, 0, ${opacity})`,
          strokeWidth: 2
        },
        {
          data: expenseData,
          color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
          strokeWidth: 2
        }
      ],
    };
  }, [transactions]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.balance}>Current Balance: ${balance.toFixed(2)}</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            propsForDots: {
              r: "4",
              strokeWidth: "2",
            }
          }}
          bezier
          style={styles.chart}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={styles.input}
            placeholder="Category"
            value={category}
            onChangeText={setCategory}
          />
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.typeButton, isIncome && styles.activeIncome]}
              onPress={() => setIsIncome(true)}
            >
              <Text style={styles.buttonText}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeButton, !isIncome && styles.activeExpense]}
              onPress={() => setIsIncome(false)}
            >
              <Text style={styles.buttonText}>Expense</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[
              styles.addButton, 
              { backgroundColor: isIncome ? '#28a745' : '#dc3545' }
            ]} 
            onPress={addTransaction}
          >
            <Text style={styles.addButtonText}>Add Transaction</Text>
          </TouchableOpacity>
        </View>

        {transactions.map((transaction) => (
          <TouchableOpacity 
            key={transaction.id}
            style={[
              styles.transactionItem,
              { backgroundColor: transaction.isIncome ? '#e6f7e6' : '#ffe6e6' }
            ]}
            onLongPress={() => deleteTransaction(transaction.id)}
          >
            <View>
              <Text style={styles.transactionCategory}>{transaction.category}</Text>
              <Text style={styles.transactionDate}>
                {new Date(transaction.date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
            <Text style={[
              styles.transactionAmount,
              { color: transaction.isIncome ? '#28a745' : '#dc3545' }
            ]}>
              ${transaction.amount.toFixed(2)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {transactions.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.deleteAllButton} 
            onPress={deleteAllTransactions}
          >
            <Text style={styles.deleteAllText}>Delete All Transactions</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    elevation: 3,
    zIndex: 2,
    paddingTop:50
  },
  balance: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  chart: {
    marginVertical: 20,
    borderRadius: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  typeButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeIncome: {
    backgroundColor: '#28a745',
  },
  activeExpense: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: 'white',
    elevation: 2,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 3,
  },
  deleteAllButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteAllText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default App;