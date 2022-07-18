(module
  (import
    "wasi_unstable"
    "fd_write"
    (func
      $fd_write
      (param
        i32
        i32
        i32
        i32
      )
      (result i32)
    )
  )
  (memory $mem 1)
  (export
    "memory"
    (memory 0)
  )
  (global
    $mem_max_addr
    (mut i32)
    (i32.const 65536)
  )
  (global
    $mem_next_free
    (mut i32)
    (i32.const 0)
  )
  (func
    $mem_alloc
    (param $bytes i32)
    (result i32)
    (local $_result i32)
    (if
      (i32.lt_u
        (i32.sub
          (global.get $mem_max_addr)
          (global.get $mem_next_free)
        )
        (local.get $bytes)
      )
      (then
        (memory.grow
          (i32.div_u
            (i32.add
              (local.get $bytes)
              (i32.const 65527)
            )
            (i32.const 65528)
          )
        )
        (drop)
        (global.set
          $mem_max_addr
          (i32.add
            (global.get $mem_max_addr)
            (local.get $bytes)
          )
        )
      )
    )
    (local.set
      $_result
      (global.get $mem_next_free)
    )
    (global.set
      $mem_next_free
      (i32.add
        (local.get $bytes)
        (global.get $mem_next_free)
      )
    )
    (local.get $_result)
  )
  (func
    $False
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 0)
    )
    (local.get $struct_start_address)
  )
  (func
    $True
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 1)
    )
    (local.get $struct_start_address)
  )
  (func
    $Cons
    (param $param0 i32)
    (param $param1 i32)
    (result i32)
    (local $struct_start_address i32)
    (i32.const 12)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 2)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 4)
      )
      (local.get $param0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 8)
      )
      (local.get $param1)
    )
    (local.get $struct_start_address)
  )
  (func
    $Nil
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 3)
    )
    (local.get $struct_start_address)
  )
  (func
    $IOVec
    (param $param0 i32)
    (param $param1 i32)
    (result i32)
    (local $struct_start_address i32)
    (i32.const 12)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 4)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 4)
      )
      (local.get $param0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 8)
      )
      (local.get $param1)
    )
    (local.get $struct_start_address)
  )
  (func
    $add
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.add
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $sub
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.sub
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $eq
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.eq
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $_lt
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.lt_s
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $_ge
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.ge_s
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $rem
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.rem_s
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $dec
    (param $a i32)
    (result i32)
    (i32.sub
      (local.get $a)
      (i32.const -1)
    )
  )
  (func
    $div
    (param $a i32)
    (param $b i32)
    (result i32)
    (i32.div_s
      (local.get $a)
      (local.get $b)
    )
  )
  (func
    $malloc
    (param $bytes i32)
    (result i32)
    (local.get $bytes)
    (call $mem_alloc)
  )
  (func
    $setByte
    (param $address i32)
    (param $value i32)
    (param $retvalue i32)
    (result i32)
    (i32.store
      (local.get $address)
      (local.get $value)
    )
    (local.get $retvalue)
  )
  (func
    $logIOVec
    (param $iovecAddress i32)
    (result i32)
    (call
      $fd_write
      (i32.const 1)
      (local.get $iovecAddress)
      (i32.const 1)
      (i32.const 200)
    )
  )
  (func
    $isZero
    (param $a i32)
    (result i32)
    (local $var_643 i32)
    (local.set
      $var_643
      (local.get $a)
      (i32.const 0)
      (call $eq)
    )
    (if
      (result i32)
      (i32.eq
        (local.get $var_643)
        (i32.const 1)
      )
      (then
        (call $True)
      )
      (else
        (if
          (result i32)
          (i32.const 1)
          (then
            (call $False)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "isZero"
    (func $isZero)
  )
  (func
    $equal
    (param $a i32)
    (param $b i32)
    (result i32)
    (local $var_27175 i32)
    (local.set
      $var_27175
      (local.get $a)
      (local.get $b)
      (call $eq)
    )
    (if
      (result i32)
      (i32.eq
        (local.get $var_27175)
        (i32.const 1)
      )
      (then
        (call $True)
      )
      (else
        (if
          (result i32)
          (i32.const 1)
          (then
            (call $False)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "equal"
    (func $equal)
  )
  (func
    $lt
    (param $a i32)
    (param $b i32)
    (result i32)
    (local $var_15096 i32)
    (local.set
      $var_15096
      (local.get $a)
      (local.get $b)
      (call $_lt)
    )
    (if
      (result i32)
      (i32.eq
        (local.get $var_15096)
        (i32.const 1)
      )
      (then
        (call $True)
      )
      (else
        (if
          (result i32)
          (i32.const 1)
          (then
            (call $False)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "lt"
    (func $lt)
  )
  (func
    $ge
    (param $a i32)
    (param $b i32)
    (result i32)
    (local $var_53337 i32)
    (local.set
      $var_53337
      (local.get $a)
      (local.get $b)
      (call $_ge)
    )
    (if
      (result i32)
      (i32.eq
        (local.get $var_53337)
        (i32.const 1)
      )
      (then
        (call $True)
      )
      (else
        (if
          (result i32)
          (i32.const 1)
          (then
            (call $False)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "ge"
    (func $ge)
  )
  (func
    $inc
    (param $a i32)
    (result i32)
    (local.get $a)
    (i32.const 1)
    (call $add)
  )
  (export
    "inc"
    (func $inc)
  )
  (func
    $asciiListToStrInner
    (param $address i32)
    (param $list i32)
    (param $index i32)
    (result i32)
    (local $byteAddr i32)
    (local $var_62489 i32)
    (local $charCode i32)
    (local $tail i32)
    (local.get $address)
    (local.get $index)
    (call $add)
    (local.set $byteAddr)
    (local.set
      $var_62489
      (local.get $list)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_62489)
        )
        (i32.const 2)
      )
      (then
        (local.set
          $charCode
          (i32.load
            (i32.add
              (local.get $var_62489)
              (i32.const 4)
            )
          )
        )
        (local.set
          $tail
          (i32.load
            (i32.add
              (local.get $var_62489)
              (i32.const 8)
            )
          )
        )
        (local.get $byteAddr)
        (local.get $charCode)
        (local.get $address)
        (call $setByte)
        (local.get $tail)
        (local.get $index)
        (call $inc)
        (call $asciiListToStrInner)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_62489)
            )
            (i32.const 3)
          )
          (then
            (local.get $address)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "asciiListToStrInner"
    (func $asciiListToStrInner)
  )
  (func
    $asciiListToStr
    (param $list i32)
    (result i32)
    (local $memsize i32)
    (local $memstart i32)
    (local $offset i32)
    (local $address i32)
    (local.get $list)
    (call $listLength)
    (i32.const 4)
    (call $add)
    (local.set $memsize)
    (local.get $memsize)
    (call $malloc)
    (local.set $memstart)
    (local.get $memstart)
    (i32.const 4)
    (call $rem)
    (local.set $offset)
    (local.get $memstart)
    (i32.const 4)
    (local.get $offset)
    (call $sub)
    (call $add)
    (local.set $address)
    (local.get $address)
    (local.get $list)
    (i32.const 0)
    (call $asciiListToStrInner)
  )
  (export
    "asciiListToStr"
    (func $asciiListToStr)
  )
  (func
    $sysListLengthInner__
    (param $list i32)
    (param $result i32)
    (result i32)
    (local $var_31314 i32)
    (local $a i32)
    (local $tail i32)
    (local.set
      $var_31314
      (local.get $list)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_31314)
        )
        (i32.const 2)
      )
      (then
        (local.set
          $a
          (i32.load
            (i32.add
              (local.get $var_31314)
              (i32.const 4)
            )
          )
        )
        (local.set
          $tail
          (i32.load
            (i32.add
              (local.get $var_31314)
              (i32.const 8)
            )
          )
        )
        (local.get $tail)
        (local.get $result)
        (call $inc)
        (call $sysListLengthInner__)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_31314)
            )
            (i32.const 3)
          )
          (then
            (local.get $result)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "sysListLengthInner__"
    (func $sysListLengthInner__)
  )
  (func
    $listLength
    (param $list i32)
    (result i32)
    (local.get $list)
    (i32.const 0)
    (call $sysListLengthInner__)
  )
  (export
    "listLength"
    (func $listLength)
  )
  (func
    $constructorDataAddress
    (param $constructorAddress i32)
    (result i32)
    (local.get $constructorAddress)
    (i32.const 4)
    (call $add)
  )
  (export
    "constructorDataAddress"
    (func $constructorDataAddress)
  )
  (func
    $alignToFourBytes
    (result i32)
    (local $a i32)
    (local $b i32)
    (local $c i32)
    (local $d i32)
    (i32.const 0)
    (call $malloc)
    (local.set $a)
    (local.get $a)
    (i32.const 4)
    (call $rem)
    (local.set $b)
    (i32.const 4)
    (local.get $b)
    (call $sub)
    (local.set $c)
    (local.get $c)
    (call $malloc)
    (local.set $d)
    (i32.const 0)
  )
  (export
    "alignToFourBytes"
    (func $alignToFourBytes)
  )
  (func
    $printString
    (param $list i32)
    (result i32)
    (local $stringDataAddress i32)
    (local $nothing i32)
    (local $iovec i32)
    (local $iovecDataAddress i32)
    (local.get $list)
    (call $asciiListToStr)
    (local.set $stringDataAddress)
    (call $alignToFourBytes)
    (local.set $nothing)
    (local.get $stringDataAddress)
    (local.get $list)
    (call $listLength)
    (call $IOVec)
    (local.set $iovec)
    (local.get $iovec)
    (call $constructorDataAddress)
    (local.set $iovecDataAddress)
    (local.get $iovecDataAddress)
    (call $logIOVec)
  )
  (export
    "printString"
    (func $printString)
  )
  (func
    $_showI32
    (param $num i32)
    (param $result i32)
    (result i32)
    (local $charCode i32)
    (local $var_57543 i32)
    (i32.const 48)
    (local.get $num)
    (call $add)
    (local.set $charCode)
    (local.set
      $var_57543
      (local.get $num)
      (i32.const 10)
      (call $lt)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_57543)
        )
        (i32.const 1)
      )
      (then
        (local.get $charCode)
        (local.get $result)
        (call $Cons)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_57543)
            )
            (i32.const 0)
          )
          (then
            (local.get $num)
            (i32.const 10)
            (call $div)
            (i32.const 48)
            (local.get $num)
            (i32.const 10)
            (call $rem)
            (call $add)
            (local.get $result)
            (call $Cons)
            (call $_showI32)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "_showI32"
    (func $_showI32)
  )
  (func
    $showI32
    (param $num i32)
    (result i32)
    (local.get $num)
    (i32.const 10)
    (call $Nil)
    (call $Cons)
    (call $_showI32)
  )
  (export
    "showI32"
    (func $showI32)
  )
  (func
    $range
    (param $start i32)
    (param $end i32)
    (param $step i32)
    (result i32)
    (local $var_91452 i32)
    (local.set
      $var_91452
      (local.get $start)
      (local.get $end)
      (call $ge)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_91452)
        )
        (i32.const 1)
      )
      (then
        (call $Nil)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_91452)
            )
            (i32.const 0)
          )
          (then
            (local.get $start)
            (local.get $start)
            (local.get $step)
            (call $add)
            (local.get $end)
            (local.get $step)
            (call $range)
            (call $Cons)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "range"
    (func $range)
  )
  (func
    $_removeMultiples
    (param $list i32)
    (param $n i32)
    (param $result i32)
    (result i32)
    (local $var_9428 i32)
    (local $var_90871 i32)
    (local $head i32)
    (local $tail i32)
    (local.set
      $var_9428
      (local.get $list)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_9428)
        )
        (i32.const 2)
      )
      (then
        (local.set
          $head
          (i32.load
            (i32.add
              (local.get $var_9428)
              (i32.const 4)
            )
          )
        )
        (local.set
          $tail
          (i32.load
            (i32.add
              (local.get $var_9428)
              (i32.const 8)
            )
          )
        )
        (local.set
          $var_90871
          (local.get $head)
          (local.get $n)
          (call $rem)
          (call $isZero)
        )
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_90871)
            )
            (i32.const 1)
          )
          (then
            (local.get $tail)
            (local.get $n)
            (local.get $result)
            (call $_removeMultiples)
          )
          (else
            (if
              (result i32)
              (i32.eq
                (i32.load
                  (local.get $var_90871)
                )
                (i32.const 0)
              )
              (then
                (local.get $head)
                (local.get $tail)
                (local.get $n)
                (local.get $result)
                (call $_removeMultiples)
                (call $Cons)
              )
              (else
                (unreachable)
              )
            )
          )
        )
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_9428)
            )
            (i32.const 3)
          )
          (then
            (local.get $result)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "_removeMultiples"
    (func $_removeMultiples)
  )
  (func
    $removeMultiples
    (param $list i32)
    (param $n i32)
    (result i32)
    (local.get $list)
    (local.get $n)
    (call $Nil)
    (call $_removeMultiples)
  )
  (export
    "removeMultiples"
    (func $removeMultiples)
  )
  (func
    $_eratosthenes
    (param $list i32)
    (param $result i32)
    (result i32)
    (local $var_26745 i32)
    (local $head i32)
    (local $tail i32)
    (local.set
      $var_26745
      (local.get $list)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_26745)
        )
        (i32.const 2)
      )
      (then
        (local.set
          $head
          (i32.load
            (i32.add
              (local.get $var_26745)
              (i32.const 4)
            )
          )
        )
        (local.set
          $tail
          (i32.load
            (i32.add
              (local.get $var_26745)
              (i32.const 8)
            )
          )
        )
        (local.get $tail)
        (local.get $head)
        (call $removeMultiples)
        (local.get $head)
        (local.get $result)
        (call $Cons)
        (call $_eratosthenes)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_26745)
            )
            (i32.const 3)
          )
          (then
            (local.get $result)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "_eratosthenes"
    (func $_eratosthenes)
  )
  (func
    $eratosthenes
    (param $n i32)
    (result i32)
    (local $list i32)
    (i32.const 2)
    (local.get $n)
    (i32.const 1)
    (call $range)
    (local.set $list)
    (local.get $list)
    (call $Nil)
    (call $_eratosthenes)
  )
  (export
    "eratosthenes"
    (func $eratosthenes)
  )
  (func
    $printInt
    (param $n i32)
    (param $retvalue i32)
    (result i32)
    (local $nothing i32)
    (local.get $n)
    (call $showI32)
    (call $printString)
    (local.set $nothing)
    (local.get $retvalue)
  )
  (export
    "printInt"
    (func $printInt)
  )
  (func
    $printListOfInts
    (param $list i32)
    (result i32)
    (local $var_10466 i32)
    (local $n i32)
    (local $tail i32)
    (local.set
      $var_10466
      (local.get $list)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_10466)
        )
        (i32.const 2)
      )
      (then
        (local.set
          $n
          (i32.load
            (i32.add
              (local.get $var_10466)
              (i32.const 4)
            )
          )
        )
        (local.set
          $tail
          (i32.load
            (i32.add
              (local.get $var_10466)
              (i32.const 8)
            )
          )
        )
        (local.get $n)
        (local.get $tail)
        (call $printListOfInts)
        (call $printInt)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_10466)
            )
            (i32.const 3)
          )
          (then
            (i32.const 0)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "printListOfInts"
    (func $printListOfInts)
  )
  (func
    $_start
    (result i32)
    (i32.const 100)
    (call $eratosthenes)
    (call $printListOfInts)
  )
  (export
    "_start"
    (func $_start)
  )
)
